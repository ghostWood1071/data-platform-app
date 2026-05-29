#!/usr/bin/env bash
set -euo pipefail

SIZE="${1:-medium}"
RELEASE="${2:-data-exp-${SIZE}}"

cd "$(dirname "$0")/.."

required_vars=(
  COMPUTE_NAMESPACE
  SPARK_CLUSTER_IMAGE
  HIVE_METASTORE_URIS
  S3A_ENDPOINT
  SPARK_WAREHOUSE_DIR
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Required environment variable ${var_name} is not set."
    echo "When run by the portal API, Spark settings are loaded from PostgreSQL and passed as process env."
    exit 1
  fi
done

if [[ "${SPARK_CLUSTER_IMAGE}" == *:* ]]; then
  IMAGE_REPOSITORY="${SPARK_CLUSTER_IMAGE%:*}"
  IMAGE_TAG="${SPARK_CLUSTER_IMAGE##*:}"
else
  IMAGE_REPOSITORY="${SPARK_CLUSTER_IMAGE}"
  IMAGE_TAG="latest"
fi

VALUES_FILE="charts/spark-shared-cluster/values-${SIZE}.yaml"

if [ ! -f "${VALUES_FILE}" ]; then
  echo "Invalid size '${SIZE}'. Expected one of: small, medium, large."
  exit 1
fi

kubectl create secret generic spark-s3-credentials \
  --namespace "${COMPUTE_NAMESPACE}" \
  --from-literal=AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
  --from-literal=AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
  --dry-run=client \
  -o yaml | kubectl apply -f -

helm upgrade --install "${RELEASE}" charts/spark-shared-cluster \
  --namespace "${COMPUTE_NAMESPACE}" \
  -f charts/spark-shared-cluster/values.yaml \
  -f "${VALUES_FILE}" \
  --set image.repository="${IMAGE_REPOSITORY}" \
  --set image.tag="${IMAGE_TAG}" \
  --set spark.hiveMetastoreUris="${HIVE_METASTORE_URIS}" \
  --set spark.s3aEndpoint="${S3A_ENDPOINT}" \
  --set spark.warehouseDir="${SPARK_WAREHOUSE_DIR}"

echo
echo "Spark cluster is starting..."
kubectl get pods -n "${COMPUTE_NAMESPACE}" -l app.kubernetes.io/instance="${RELEASE}"
echo
echo "Spark Connect endpoint:"
echo "  sc://${RELEASE}-connect.${COMPUTE_NAMESPACE}.svc.cluster.local:15002"
