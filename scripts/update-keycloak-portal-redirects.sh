#!/usr/bin/env sh
set -eu

: "${KEYCLOAK_ADMIN_USER:?KEYCLOAK_ADMIN_USER is required}"
: "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD is required}"

SERVER="${KEYCLOAK_SERVER:-http://localhost:8080}"
ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
REALM="${KEYCLOAK_REALM:-data-team}"
PORTAL_CLIENT_ID="${PORTAL_CLIENT_ID:-data-platform-portal}"
CFG="${KCADM_CONFIG:-/tmp/kcadm-portal-redirects.config}"
KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"

json_id() {
  sed -n 's/.*"id" : "\([^"]*\)".*/\1/p' | head -n 1
}

"$KCADM" config credentials --config "$CFG" \
  --server "$SERVER" \
  --realm "$ADMIN_REALM" \
  --user "$KEYCLOAK_ADMIN_USER" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null

client_uuid="$("$KCADM" get clients -r "$REALM" --config "$CFG" \
  -q "clientId=$PORTAL_CLIENT_ID" --fields id | json_id)"

if [ -z "$client_uuid" ]; then
  echo "Client not found: $PORTAL_CLIENT_ID" >&2
  exit 1
fi

"$KCADM" update "clients/$client_uuid" -r "$REALM" --config "$CFG" \
  -s 'redirectUris=["https://app.datalabutehy.com/*","http://portal-app.k8s.tailnet/*","https://portal-app.k8s.tailnet/*","http://localhost:23721/*","http://localhost:8080/*","http://127.0.0.1:23721/*"]' \
  -s 'webOrigins=["+"]' \
  -s 'attributes."pkce.code.challenge.method"=S256' \
  -s 'attributes."post.logout.redirect.uris"="https://app.datalabutehy.com/*##http://portal-app.k8s.tailnet/*##https://portal-app.k8s.tailnet/*##http://localhost:23721/*##http://localhost:8080/*##http://127.0.0.1:23721/*"'

"$KCADM" get "clients/$client_uuid" -r "$REALM" --config "$CFG" \
  --fields clientId,redirectUris,webOrigins,attributes
