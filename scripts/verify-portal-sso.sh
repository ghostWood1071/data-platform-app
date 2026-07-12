#!/usr/bin/env sh
set -eu

: "${KEYCLOAK_ADMIN_USER:?KEYCLOAK_ADMIN_USER is required}"
: "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD is required}"
: "${PORTAL_TEST_USER:?PORTAL_TEST_USER is required}"
: "${PORTAL_TEST_PASSWORD:?PORTAL_TEST_PASSWORD is required}"

NAMESPACE="${PORTAL_NAMESPACE:-portal}"
KEYCLOAK_NAMESPACE="${KEYCLOAK_NAMESPACE:-keycloak}"
KEYCLOAK_POD="${KEYCLOAK_POD:-keycloak-0}"
REALM="${KEYCLOAK_REALM:-data-team}"
CLIENT_ID="${PORTAL_CLIENT_ID:-data-platform-portal}"
CFG="${KCADM_CONFIG:-/tmp/kcadm-portal-verify.config}"
KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"
TOKEN_URL="http://keycloak-service.keycloak.svc.cluster.local:8080/realms/$REALM/protocol/openid-connect/token"

kcadm() {
  kubectl exec -n "$KEYCLOAK_NAMESPACE" "$KEYCLOAK_POD" -- "$KCADM" "$@"
}

json_id() {
  sed -n 's/.*"id" : "\([^"]*\)".*/\1/p' | head -n 1
}

kcadm config credentials --config "$CFG" \
  --server http://localhost:8080 \
  --realm master \
  --user "$KEYCLOAK_ADMIN_USER" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null

client_uuid="$(kcadm get clients -r "$REALM" --config "$CFG" -q "clientId=$CLIENT_ID" --fields id | json_id)"

cleanup() {
  kcadm update "clients/$client_uuid" -r "$REALM" --config "$CFG" \
    -s directAccessGrantsEnabled=false >/dev/null || true
}
trap cleanup EXIT

kcadm update "clients/$client_uuid" -r "$REALM" --config "$CFG" \
  -s directAccessGrantsEnabled=true >/dev/null

token="$(
  kubectl -n "$NAMESPACE" exec deploy/data-portal-app -- env \
    TOKEN_URL="$TOKEN_URL" \
    CLIENT_ID="$CLIENT_ID" \
    PORTAL_TEST_USER="$PORTAL_TEST_USER" \
    PORTAL_TEST_PASSWORD="$PORTAL_TEST_PASSWORD" \
    sh -lc 'curl -sS -X POST "$TOKEN_URL" \
      -H "content-type: application/x-www-form-urlencoded" \
      --data-urlencode "grant_type=password" \
      --data-urlencode "client_id=$CLIENT_ID" \
      --data-urlencode "username=$PORTAL_TEST_USER" \
      --data-urlencode "password=$PORTAL_TEST_PASSWORD" |
      node -e "let body=\"\";process.stdin.on(\"data\",c=>body+=c);process.stdin.on(\"end\",()=>{const data=JSON.parse(body); if(!data.access_token){console.error(body); process.exit(1)} console.log(data.access_token)})"'
)"

echo "auth/me:"
kubectl -n "$NAMESPACE" exec deploy/data-portal-app -- \
  curl -sS -H "Authorization: Bearer $token" http://localhost/api/auth/me
echo

echo "users:"
kubectl -n "$NAMESPACE" exec deploy/data-portal-app -- \
  curl -sS -o /tmp/users-response.json -w "%{http_code}" \
    -H "Authorization: Bearer $token" http://localhost/api/users
echo

echo "dashboard:"
kubectl -n "$NAMESPACE" exec deploy/data-portal-app -- \
  curl -sS -o /tmp/dashboard-response.json -w "%{http_code}" \
    -H "Authorization: Bearer $token" http://localhost/api/dashboard/summary
echo
