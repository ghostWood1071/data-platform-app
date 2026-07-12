#!/usr/bin/env sh
set -eu

: "${KEYCLOAK_ADMIN_USER:?KEYCLOAK_ADMIN_USER is required}"
: "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD is required}"

SERVER="${KEYCLOAK_SERVER:-http://localhost:8080}"
ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
REALM="${KEYCLOAK_REALM:-data-team}"
PORTAL_CLIENT_ID="${PORTAL_CLIENT_ID:-data-platform-portal}"
ADMIN_CLIENT_ID="${PORTAL_ADMIN_CLIENT_ID:-data-platform-admin-api}"
CFG="${KCADM_CONFIG:-/tmp/kcadm-portal.config}"
KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"

log() {
  printf '%s\n' "$*" >&2
}

json_id() {
  sed -n 's/.*"id" : "\([^"]*\)".*/\1/p' | head -n 1
}

json_secret() {
  sed -n 's/.*"value" : "\([^"]*\)".*/\1/p' | head -n 1
}

client_id() {
  "$KCADM" get clients -r "$REALM" --config "$CFG" \
    -q "clientId=$1" --fields id | json_id
}

ensure_role() {
  role="$1"
  description="$2"
  if "$KCADM" get "roles/$role" -r "$REALM" --config "$CFG" >/dev/null 2>&1; then
    log "role exists: $role"
  else
    "$KCADM" create roles -r "$REALM" --config "$CFG" \
      -s "name=$role" \
      -s "description=$description" >/dev/null
    log "role created: $role"
  fi
}

upsert_public_client() {
  cid="$(client_id "$PORTAL_CLIENT_ID" || true)"
  if [ -z "$cid" ]; then
    "$KCADM" create clients -r "$REALM" --config "$CFG" \
      -s "clientId=$PORTAL_CLIENT_ID" \
      -s "name=Data Platform Portal" \
      -s "protocol=openid-connect" \
      -s "enabled=true" \
      -s "publicClient=true" \
      -s "standardFlowEnabled=true" \
      -s "implicitFlowEnabled=false" \
      -s "directAccessGrantsEnabled=false" \
      -s 'redirectUris=["https://app.datalabutehy.com/*","http://portal-app.k8s.tailnet/*","https://portal-app.k8s.tailnet/*","http://localhost:23721/*","http://localhost:8080/*","http://127.0.0.1:23721/*"]' \
      -s 'webOrigins=["+"]' \
      -s 'attributes."pkce.code.challenge.method"=S256' \
      -s 'attributes."post.logout.redirect.uris"="https://app.datalabutehy.com/*##http://portal-app.k8s.tailnet/*##https://portal-app.k8s.tailnet/*##http://localhost:23721/*##http://localhost:8080/*##http://127.0.0.1:23721/*"' >/dev/null
    log "client created: $PORTAL_CLIENT_ID"
  else
    "$KCADM" update "clients/$cid" -r "$REALM" --config "$CFG" \
      -s "name=Data Platform Portal" \
      -s "protocol=openid-connect" \
      -s "enabled=true" \
      -s "publicClient=true" \
      -s "standardFlowEnabled=true" \
      -s "implicitFlowEnabled=false" \
      -s "directAccessGrantsEnabled=false" \
      -s 'redirectUris=["https://app.datalabutehy.com/*","http://portal-app.k8s.tailnet/*","https://portal-app.k8s.tailnet/*","http://localhost:23721/*","http://localhost:8080/*","http://127.0.0.1:23721/*"]' \
      -s 'webOrigins=["+"]' \
      -s 'attributes."pkce.code.challenge.method"=S256' \
      -s 'attributes."post.logout.redirect.uris"="https://app.datalabutehy.com/*##http://portal-app.k8s.tailnet/*##https://portal-app.k8s.tailnet/*##http://localhost:23721/*##http://localhost:8080/*##http://127.0.0.1:23721/*"' >/dev/null
    log "client updated: $PORTAL_CLIENT_ID"
  fi
}

upsert_admin_client() {
  cid="$(client_id "$ADMIN_CLIENT_ID" || true)"
  if [ -z "$cid" ]; then
    "$KCADM" create clients -r "$REALM" --config "$CFG" \
      -s "clientId=$ADMIN_CLIENT_ID" \
      -s "name=Data Platform Portal Admin API" \
      -s "protocol=openid-connect" \
      -s "enabled=true" \
      -s "publicClient=false" \
      -s "serviceAccountsEnabled=true" \
      -s "standardFlowEnabled=false" \
      -s "implicitFlowEnabled=false" \
      -s "directAccessGrantsEnabled=false" >/dev/null
    log "client created: $ADMIN_CLIENT_ID"
    cid="$(client_id "$ADMIN_CLIENT_ID")"
  else
    "$KCADM" update "clients/$cid" -r "$REALM" --config "$CFG" \
      -s "name=Data Platform Portal Admin API" \
      -s "protocol=openid-connect" \
      -s "enabled=true" \
      -s "publicClient=false" \
      -s "serviceAccountsEnabled=true" \
      -s "standardFlowEnabled=false" \
      -s "implicitFlowEnabled=false" \
      -s "directAccessGrantsEnabled=false" >/dev/null
    log "client updated: $ADMIN_CLIENT_ID"
  fi

  "$KCADM" add-roles -r "$REALM" --config "$CFG" \
    --uusername "service-account-$ADMIN_CLIENT_ID" \
    --cclientid realm-management \
    --rolename manage-users \
    --rolename view-users \
    --rolename query-users \
    --rolename view-realm \
    --rolename view-clients >/dev/null || true

  "$KCADM" get "clients/$cid/client-secret" -r "$REALM" --config "$CFG" --fields value | json_secret
}

assign_default_roles() {
  "$KCADM" add-roles -r "$REALM" --config "$CFG" \
    --uusername dqthinh1 --rolename platform_admin >/dev/null || true

  for username in $("$KCADM" get users -r "$REALM" --config "$CFG" --fields username | sed -n 's/.*"username" : "\([^"]*\)".*/\1/p'); do
    if [ "$username" != "dqthinh1" ]; then
      "$KCADM" add-roles -r "$REALM" --config "$CFG" \
        --uusername "$username" --rolename viewer >/dev/null || true
    fi
  done
}

"$KCADM" config credentials --config "$CFG" \
  --server "$SERVER" \
  --realm "$ADMIN_REALM" \
  --user "$KEYCLOAK_ADMIN_USER" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null

ensure_role platform_admin "Full access to all platform pages, APIs, and actions"
ensure_role cluster_admin "Can view, start, stop, resize, and configure Spark clusters"
ensure_role data_engineer "Can access data engineering tools and view Spark clusters"
ensure_role analyst "Can access notebooks, Spark Thrift, dashboards, and read-only pages"
ensure_role viewer "Can view dashboard and about pages only"

upsert_public_client
admin_secret="$(upsert_admin_client)"
assign_default_roles

printf '%s\n' "$admin_secret"
