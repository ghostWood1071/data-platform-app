#!/bin/bash
set -euo pipefail

RELEASE_NAME=$1

if [ -z "${COMPUTE_NAMESPACE:-}" ]; then
  echo "Required environment variable COMPUTE_NAMESPACE is not set."
  echo "When run by the portal API, Spark settings are loaded from PostgreSQL and passed as process env."
  exit 1
fi

NAMESPACE="${COMPUTE_NAMESPACE}"

echo "Operation: STOP"
echo "Release: $RELEASE_NAME"

echo "Scaling down components..."
kubectl scale deployment "${RELEASE_NAME}-connect" --replicas=0 -n "${NAMESPACE}"
kubectl scale statefulset "${RELEASE_NAME}-worker" --replicas=0 -n "${NAMESPACE}"
kubectl scale deployment "${RELEASE_NAME}-master" --replicas=0 -n "${NAMESPACE}"
echo "Done."
