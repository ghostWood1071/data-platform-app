#!/bin/bash
set -euo pipefail

RELEASE_NAME=$1

if [ -f ".env" ]; then
  set -a
  . ".env"
  set +a
fi

NAMESPACE="${COMPUTE_NAMESPACE:-compute}"

echo "Operation: STOP"
echo "Release: $RELEASE_NAME"

echo "Scaling down components..."
kubectl scale deployment "${RELEASE_NAME}-connect" --replicas=0 -n "${NAMESPACE}"
kubectl scale statefulset "${RELEASE_NAME}-worker" --replicas=0 -n "${NAMESPACE}"
kubectl scale deployment "${RELEASE_NAME}-master" --replicas=0 -n "${NAMESPACE}"
echo "Done."
