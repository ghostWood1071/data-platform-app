import { Router, type IRouter } from "express";
import { GetServicesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const mockServices = [
  {
    id: "minio",
    name: "MinIO",
    description: "Object Storage",
    namespace: "storage",
    status: "Running" as const,
    url: "https://minio.k8s.tailnet",
    category: "storage",
    isJdbc: null,
  },
  {
    id: "notebook",
    name: "JupyterHub",
    description: "Notebook Environment",
    namespace: "notebook",
    status: "Running" as const,
    url: "https://notebook.k8s.tailnet",
    category: "compute",
    isJdbc: null,
  },
  {
    id: "spark-thrift",
    name: "Spark Thrift Server",
    description: "JDBC/Thrift SQL Gateway",
    namespace: "compute",
    status: "Running" as const,
    url: "jdbc:hive2://spark-thrift.compute.svc.cluster.local:10000/default",
    category: "compute",
    isJdbc: true,
  },
  {
    id: "spark-ui",
    name: "Spark Cluster UI",
    description: "Spark Master UI",
    namespace: "compute",
    status: "Running" as const,
    url: "https://spark.k8s.tailnet",
    category: "compute",
    isJdbc: null,
  },
  {
    id: "airflow",
    name: "Apache Airflow",
    description: "Workflow Orchestration",
    namespace: "orchestration",
    status: "Running" as const,
    url: "https://airflow.k8s.tailnet",
    category: "orchestration",
    isJdbc: null,
  },
  {
    id: "kafka",
    name: "Kafka UI",
    description: "Kafka Management UI",
    namespace: "streaming",
    status: "Running" as const,
    url: "https://kafka.k8s.tailnet",
    category: "streaming",
    isJdbc: null,
  },
  {
    id: "openmetadata",
    name: "OpenMetadata",
    description: "Metadata Catalog",
    namespace: "metadata",
    status: "Running" as const,
    url: "https://openmetadata.k8s.tailnet",
    category: "metadata",
    isJdbc: null,
  },
];

router.get("/services", async (_req, res): Promise<void> => {
  res.json(GetServicesResponse.parse(mockServices));
});

export default router;
