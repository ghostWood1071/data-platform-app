#!/usr/bin/env sh
set -eu

: "${KEYCLOAK_ADMIN_USER:?KEYCLOAK_ADMIN_USER is required}"
: "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD is required}"

NAMESPACE="${KEYCLOAK_NAMESPACE:-keycloak}"
POD="${KEYCLOAK_POD:-keycloak-0}"
PORTAL_NAMESPACE="${PORTAL_NAMESPACE:-portal}"
LOCAL_CONFIG_SCRIPT="${LOCAL_CONFIG_SCRIPT:-/tmp/configure-keycloak-portal.sh}"
POD_CONFIG_SCRIPT="${POD_CONFIG_SCRIPT:-/tmp/configure-keycloak-portal.sh}"

kubectl exec -i -n "$NAMESPACE" "$POD" -- sh -c "cat > '$POD_CONFIG_SCRIPT'" < "$LOCAL_CONFIG_SCRIPT"
kubectl exec -n "$NAMESPACE" "$POD" -- chmod +x "$POD_CONFIG_SCRIPT"

secret="$(
  kubectl exec -n "$NAMESPACE" "$POD" -- sh -lc \
    "KEYCLOAK_ADMIN_USER='$KEYCLOAK_ADMIN_USER' KEYCLOAK_ADMIN_PASSWORD='$KEYCLOAK_ADMIN_PASSWORD' '$POD_CONFIG_SCRIPT'" \
    2>/tmp/portal-keycloak-config.log
)"

if [ -z "$secret" ]; then
  echo "Keycloak admin client secret was empty" >&2
  exit 1
fi

kubectl -n "$PORTAL_NAMESPACE" create secret generic portal-keycloak-admin-secret \
  --from-literal="KEYCLOAK_ADMIN_CLIENT_SECRET=$secret" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

kubectl -n "$PORTAL_NAMESPACE" get secret portal-keycloak-admin-secret
