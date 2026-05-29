#!/usr/bin/env bash
set -euo pipefail

RELEASE="${1:-data-exp-medium}"
REPLICAS="${2:-2}"

cd "$(dirname "$0")/.."

if [ -z "${COMPUTE_NAMESPACE:-}" ]; then
  echo "Required environment variable COMPUTE_NAMESPACE is not set."
  echo "When run by the portal API, Spark settings are loaded from PostgreSQL and passed as process env."
  exit 1
fi

echo "Resizing ${RELEASE} workers to replicas=${REPLICAS}"

kubectl scale statefulset "${RELEASE}-worker" \
  -n "${COMPUTE_NAMESPACE}" \
  --replicas="${REPLICAS}"

kubectl rollout status statefulset "${RELEASE}-worker" -n "${COMPUTE_NAMESPACE}" || true
kubectl get pods -n "${COMPUTE_NAMESPACE}" -l app.kubernetes.io/instance="${RELEASE}"
