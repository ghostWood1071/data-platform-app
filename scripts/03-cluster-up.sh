#!/bin/bash
set -euo pipefail

SIZE=$1
RELEASE_NAME=$2

if [ -f ".env" ]; then
  set -a
  . ".env"
  set +a
fi

APPLY_NAMESPACE="${APPLY_NAMESPACE:-false}"
NAMESPACE="${COMPUTE_NAMESPACE:-compute}"
VALUES_FILE="./charts/spark-shared-cluster/values-${SIZE}.yaml"

echo "Operation: START"
echo "Release: $RELEASE_NAME"
echo "Size: $SIZE"

if [ "${APPLY_NAMESPACE}" = "true" ]; then
  echo "Applying namespaces..."
  kubectl apply -f k8s/00-namespaces.yaml
fi

echo "Deploying Spark Cluster via Helm..."
helm upgrade --install "${RELEASE_NAME}" ./charts/spark-shared-cluster \
  --namespace "${NAMESPACE}" \
  --values "${VALUES_FILE}"
echo "Done."
