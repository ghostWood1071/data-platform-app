import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const summary = {
    services: [
      { name: "Spark Cluster", status: "Running", description: "Apache Spark compute cluster" },
      { name: "MinIO", status: "Running", description: "Object storage service" },
      { name: "JupyterHub", status: "Running", description: "Notebook environment" },
      { name: "Apache Airflow", status: "Running", description: "Workflow orchestration" },
      { name: "Kafka UI", status: "Running", description: "Kafka management" },
      { name: "OpenMetadata", status: "Running", description: "Metadata catalog" },
    ],
    clusterStatus: "Running",
    workerCount: 3,
    recentActivity: [
      { id: "1", actor: "admin", action: "Started Spark cluster", timestamp: "2025-05-23T08:00:00Z", details: null },
      { id: "2", actor: "admin", action: "Scaled Spark workers from 2 to 4", timestamp: "2025-05-23T08:15:00Z", details: null },
      { id: "3", actor: "thinh", action: "Opened Airflow", timestamp: "2025-05-23T09:00:00Z", details: null },
      { id: "4", actor: "admin", action: "Disabled user viewer1", timestamp: "2025-05-23T09:30:00Z", details: null },
      { id: "5", actor: "analyst1", action: "Opened JupyterHub", timestamp: "2025-05-23T10:00:00Z", details: null },
    ],
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
