import type { SparkCluster, SparkPod, PlatformService, User, AuditLog, Role } from "@workspace/api-client-react/src/generated/api.schemas";

export const MOCK_SPARK_CLUSTER: SparkCluster = {
  clusterName: "data-exp-small",
  namespace: "compute",
  masterStatus: "Running",
  workerStatus: "Running",
  currentWorkerReplicas: 3,
  desiredWorkerReplicas: 3,
  sparkMasterUrl: "spark://data-exp-small-master.compute.svc.cluster.local:7077",
  sparkUiUrl: "https://spark.k8s.tailnet"
};

export const MOCK_SPARK_PODS: SparkPod[] = [
  { podName: "data-exp-small-master-abc12", role: "master", status: "Running", node: "node-01", cpu: "800m", memory: "2Gi", age: "3d" },
  { podName: "data-exp-small-worker-1", role: "worker", status: "Running", node: "node-02", cpu: "1200m", memory: "4Gi", age: "3d" },
  { podName: "data-exp-small-worker-2", role: "worker", status: "Running", node: "node-03", cpu: "1100m", memory: "4Gi", age: "3d" },
  { podName: "data-exp-small-worker-3", role: "worker", status: "Running", node: "node-01", cpu: "950m", memory: "4Gi", age: "2d" }
];

export const MOCK_SERVICES: PlatformService[] = [
  { id: "minio", name: "MinIO", description: "Object Storage", namespace: "storage", status: "Running", url: "https://minio.k8s.tailnet", category: "storage" },
  { id: "notebook", name: "JupyterHub", description: "Notebook Environment", namespace: "notebook", status: "Running", url: "https://notebook.k8s.tailnet", category: "compute" },
  { id: "spark-thrift", name: "Spark Thrift Server", description: "JDBC/Thrift SQL Gateway", namespace: "compute", status: "Running", url: "jdbc:hive2://spark-thrift.compute.svc.cluster.local:10000/default", category: "compute", isJdbc: true },
  { id: "spark-ui", name: "Spark Cluster UI", description: "Spark Master UI", namespace: "compute", status: "Running", url: "https://spark.k8s.tailnet", category: "compute" },
  { id: "airflow", name: "Apache Airflow", description: "Workflow Orchestration", namespace: "orchestration", status: "Running", url: "https://airflow.k8s.tailnet", category: "orchestration" },
  { id: "kafka", name: "Kafka UI", description: "Kafka Management UI", namespace: "streaming", status: "Running", url: "https://kafka.k8s.tailnet", category: "streaming" },
  { id: "openmetadata", name: "OpenMetadata", description: "Metadata Catalog", namespace: "metadata", status: "Running", url: "https://openmetadata.k8s.tailnet", category: "metadata" }
];

export const MOCK_USERS: User[] = [
  { id: "1", username: "admin", fullName: "Administrator", email: "admin@platform.local", role: "platform_admin", status: "active", createdAt: "2025-01-01T00:00:00Z" },
  { id: "2", username: "thinh", fullName: "Thinh Nguyen", email: "thinh@platform.local", role: "data_engineer", status: "active", createdAt: "2025-02-01T00:00:00Z" },
  { id: "3", username: "analyst1", fullName: "Data Analyst", email: "analyst1@platform.local", role: "analyst", status: "active", createdAt: "2025-03-01T00:00:00Z" },
  { id: "4", username: "viewer1", fullName: "Viewer User", email: "viewer1@platform.local", role: "viewer", status: "active", createdAt: "2025-04-01T00:00:00Z" }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: "1", actor: "admin", action: "Started Spark cluster", timestamp: "2025-05-23T08:00:00Z" },
  { id: "2", actor: "admin", action: "Scaled Spark workers from 2 to 4", timestamp: "2025-05-23T08:15:00Z" },
  { id: "3", actor: "thinh", action: "Opened Airflow", timestamp: "2025-05-23T09:00:00Z" },
  { id: "4", actor: "admin", action: "Disabled user viewer1", timestamp: "2025-05-23T09:30:00Z" },
  { id: "5", actor: "analyst1", action: "Opened JupyterHub", timestamp: "2025-05-23T10:00:00Z" }
];

export const MOCK_ROLES: Role[] = [
  { name: "platform_admin", description: "Full access to all platform resources", permissions: ["*"] },
  { name: "cluster_admin", description: "Manage compute clusters", permissions: ["cluster.spark.view", "cluster.spark.start", "cluster.spark.stop", "cluster.spark.scale"] },
  { name: "data_engineer", description: "Access data engineering tools", permissions: ["cluster.spark.view", "service.minio.open", "service.notebook.open", "service.airflow.open", "service.kafka.open", "service.openmetadata.open"] },
  { name: "analyst", description: "Access query and notebook tools", permissions: ["cluster.spark.view", "service.notebook.open", "service.spark-thrift.open"] },
  { name: "viewer", description: "View-only access to dashboard", permissions: ["dashboard.view", "about.view"] }
];
