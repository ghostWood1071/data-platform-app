#!/usr/bin/env sh
set -eu

NAMESPACE="${PORTAL_NAMESPACE:-portal}"
DEPLOYMENT="${PORTAL_DEPLOYMENT:-data-portal-app}"
CONTAINER="${PORTAL_CONTAINER:-data-portal-app}"
IMAGE="${PORTAL_IMAGE:-ghostwood/data-platform-portal:latest}"
PVC="${PORTAL_RUNTIME_PVC:-portal-runtime-overrides}"
LOADER_POD="${PORTAL_LOADER_POD:-portal-overrides-loader}"
API_DIST="${API_DIST:-artifacts/api-server/dist}"
FRONTEND_DIST="${FRONTEND_DIST:-artifacts/data-platform-portal/dist/public}"
KUSTOMIZE_DIR="${KUSTOMIZE_DIR:-k8s}"

kubectl -n "$NAMESPACE" apply -f - <<YAML
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $PVC
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
YAML

kubectl -n "$NAMESPACE" delete pod "$LOADER_POD" --ignore-not-found=true --wait=true
kubectl -n "$NAMESPACE" apply -f - <<YAML
apiVersion: v1
kind: Pod
metadata:
  name: $LOADER_POD
spec:
  restartPolicy: Never
  containers:
    - name: loader
      image: $IMAGE
      command: ["sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: runtime-overrides
          mountPath: /overrides
  volumes:
    - name: runtime-overrides
      persistentVolumeClaim:
        claimName: $PVC
YAML

kubectl -n "$NAMESPACE" wait --for=condition=Ready "pod/$LOADER_POD" --timeout=180s
kubectl -n "$NAMESPACE" exec "$LOADER_POD" -- sh -lc \
  'rm -rf /overrides/api-server-dist /overrides/frontend && mkdir -p /overrides/api-server-dist /overrides/frontend'

kubectl -n "$NAMESPACE" cp "$API_DIST/." "$LOADER_POD:/overrides/api-server-dist"
kubectl -n "$NAMESPACE" cp "$FRONTEND_DIST/." "$LOADER_POD:/overrides/frontend"

kubectl apply -k "$KUSTOMIZE_DIR"

kubectl -n "$NAMESPACE" patch deployment "$DEPLOYMENT" --type strategic -p "
spec:
  template:
    spec:
      volumes:
        - name: runtime-overrides
          persistentVolumeClaim:
            claimName: $PVC
      containers:
        - name: $CONTAINER
          volumeMounts:
            - name: runtime-overrides
              mountPath: /app/artifacts/api-server/dist
              subPath: api-server-dist
              readOnly: true
            - name: runtime-overrides
              mountPath: /var/www/html
              subPath: frontend
              readOnly: true
"

kubectl -n "$NAMESPACE" rollout restart "deployment/$DEPLOYMENT"
kubectl -n "$NAMESPACE" rollout status "deployment/$DEPLOYMENT" --timeout=300s
kubectl -n "$NAMESPACE" delete pod "$LOADER_POD" --ignore-not-found=true --wait=false
