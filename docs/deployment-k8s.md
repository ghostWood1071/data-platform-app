# Kubernetes Deployment

This deploys the data platform portal, PostgreSQL, Spark management RBAC, and Nginx Ingress.

## Prerequisites

- Kubernetes cluster is reachable from the master node.
- Nginx IngressClass exists as `nginx`.
- Default StorageClass exists for the PostgreSQL PVC.
- The app image is built and pushed to a registry reachable by all Kubernetes nodes.

The app manifest must not use a local-only image such as `data-portal-app:latest` unless that image is loaded into every node runtime.

## Build And Push Image

From a machine with Docker access:

```bash
docker build -t ghostwood/data-platform-portal:1.0.0 .
docker push ghostwood/data-platform-portal:1.0.0
```

Then update the image used by Kustomize:

```bash
cd k8s
kubectl apply -k k8s
```

Or edit `k8s/kustomization.yaml`:

```yaml
images:
  - name: data-portal-app
    newName: ghostwood/data-platform-portal
    newTag: 1.0.0
```

## Deploy

Apply all manifests:

```bash
kubectl apply -k k8s
```

Equivalent explicit order:

```bash
kubectl apply -f k8s/00-namespaces.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/spark-manager.yaml
kubectl apply -f k8s/deploy.yaml
```

## Verify

```bash
kubectl -n portal rollout status deployment/portal-postgres --timeout=180s
kubectl -n portal rollout status deployment/data-portal-app --timeout=180s
kubectl -n portal get pods,svc,ingress
kubectl -n portal exec deployment/portal-postgres -- \
  psql -U data_platform -d data_platform -c '\dt'
```

Expected database tables:

- `spark_cluster_operations`
- `spark_cluster_settings`

## Ingress

Host:

```text
portal-app.k8s.tailnet
```

Routes:

- `/` serves the frontend through the app Nginx container.
- `/api` routes to the same service; the app Nginx proxies API requests to the Node backend on port `8080`.

## Spark Management

The portal API runs with ServiceAccount `portal-api-server` in namespace `portal`.

It has namespaced RBAC in namespace `compute` to:

- read Deployment/StatefulSet status
- scale Spark master/connect/worker
- run Helm-created compute namespace resources
- create/update Spark S3 credential Secret from DB-backed settings

The API does not receive `cluster-admin`.

Spark settings are stored in PostgreSQL table `spark_cluster_settings` and can be edited from the Spark page in the portal. The backend injects those settings as environment variables when spawning the cluster scripts.

## Troubleshooting

### ImagePullBackOff

Check the pod events:

```bash
kubectl -n portal describe pod -l app=data-portal-app
```

If you see Kubernetes pulling `docker.io/library/data-portal-app:latest`, the image was not pushed to a registry. Build and push the image, then update `k8s/kustomization.yaml` or run:

```bash
kubectl -n portal set image deployment/data-portal-app \
  data-portal-app=ghostwood/data-platform-portal:1.0.0
```

### Database Init Did Not Run

PostgreSQL only runs `/docker-entrypoint-initdb.d` scripts when the data volume is empty. For an existing PVC, apply SQL migrations manually:

```bash
kubectl -n portal exec -i deployment/portal-postgres -- \
  psql -U data_platform -d data_platform < lib/db/migrations/0001_spark_cluster_operations.sql

kubectl -n portal exec -i deployment/portal-postgres -- \
  psql -U data_platform -d data_platform < lib/db/migrations/0002_spark_cluster_settings.sql
```

### Deployment Test Result On Master

Tested with:

```bash
ssh hduser@master
kubectl apply -f k8s/00-namespaces.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/spark-manager.yaml
kubectl apply -f k8s/deploy.yaml
```

Observed:

- PostgreSQL rolled out successfully.
- Tables `spark_cluster_operations` and `spark_cluster_settings` were created.
- The app deployment reached `ImagePullBackOff` because `data-portal-app:latest` was not available in a registry or on the node runtime.

The user `hduser` can use `kubectl` but does not have Docker/containerd socket access and sudo requires a password, so the image could not be built or loaded into the cluster during this test session.
