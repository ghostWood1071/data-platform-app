import { Router, type IRouter } from "express";
import { GetRolesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const mockRoles = [
  {
    name: "platform_admin",
    description: "Full access to all pages and actions",
    permissions: [
      "cluster.spark.view",
      "cluster.spark.start",
      "cluster.spark.stop",
      "cluster.spark.scale",
      "spark_cluster:view",
      "spark_cluster:start",
      "spark_cluster:stop",
      "spark_cluster:resize",
      "spark_cluster:settings",
      "service.minio.open",
      "service.notebook.open",
      "service.airflow.open",
      "service.kafka.open",
      "service.openmetadata.open",
      "service.spark-thrift.open",
      "service.spark-ui.open",
      "user.view",
      "user.create",
      "user.update",
      "user.disable",
      "user.delete",
      "role.view",
      "role.update",
      "dashboard.view",
      "about.view",
    ],
  },
  {
    name: "cluster_admin",
    description: "Can view, start, stop, and scale Spark clusters",
    permissions: [
      "cluster.spark.view",
      "cluster.spark.start",
      "cluster.spark.stop",
      "cluster.spark.scale",
      "spark_cluster:view",
      "spark_cluster:start",
      "spark_cluster:stop",
      "spark_cluster:resize",
      "spark_cluster:settings",
      "dashboard.view",
      "about.view",
    ],
  },
  {
    name: "data_engineer",
    description: "Can access Notebook, Spark, Airflow, MinIO, Kafka, and OpenMetadata",
    permissions: [
      "cluster.spark.view",
      "spark_cluster:view",
      "service.minio.open",
      "service.notebook.open",
      "service.airflow.open",
      "service.kafka.open",
      "service.openmetadata.open",
      "service.spark-thrift.open",
      "service.spark-ui.open",
      "dashboard.view",
      "about.view",
    ],
  },
  {
    name: "analyst",
    description: "Can access Notebook, Spark Thrift, and dashboards",
    permissions: [
      "cluster.spark.view",
      "spark_cluster:view",
      "service.notebook.open",
      "service.spark-thrift.open",
      "dashboard.view",
      "about.view",
    ],
  },
  {
    name: "viewer",
    description: "Can only view dashboard and about page",
    permissions: ["dashboard.view", "about.view"],
  },
];

router.get("/roles", async (_req, res): Promise<void> => {
  res.json(GetRolesResponse.parse(mockRoles));
});

export default router;
