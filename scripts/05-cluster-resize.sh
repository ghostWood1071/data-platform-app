#!/bin/bash
set -euo pipefail

RELEASE_NAME=$1
REPLICAS=$2

if [ -f ".env" ]; then
  set -a
  . ".env"
  set +a
fi

NAMESPACE="${COMPUTE_NAMESPACE:-compute}"

echo "Operation: RESIZE"
echo "Release: $RELEASE_NAME"
echo "Replicas: $REPLICAS"

echo "Scaling workers..."
kubectl scale statefulset "${RELEASE_NAME}-worker" --replicas="${REPLICAS}" -n "${NAMESPACE}"
echo "Done."
