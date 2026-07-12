import { Router, type IRouter } from "express";
import { GetAuditLogsResponse } from "@workspace/api-zod";
import { requirePermission } from "../middleware/auth";

const router: IRouter = Router();

const mockAuditLogs = [
  {
    id: "1",
    actor: "admin",
    action: "Started Spark cluster",
    timestamp: "2025-05-23T08:00:00Z",
    details: null,
  },
  {
    id: "2",
    actor: "admin",
    action: "Scaled Spark workers from 2 to 4",
    timestamp: "2025-05-23T08:15:00Z",
    details: null,
  },
  {
    id: "3",
    actor: "thinh",
    action: "Opened Airflow",
    timestamp: "2025-05-23T09:00:00Z",
    details: null,
  },
  {
    id: "4",
    actor: "admin",
    action: "Disabled user viewer1",
    timestamp: "2025-05-23T09:30:00Z",
    details: null,
  },
  {
    id: "5",
    actor: "analyst1",
    action: "Opened JupyterHub",
    timestamp: "2025-05-23T10:00:00Z",
    details: null,
  },
  {
    id: "6",
    actor: "admin",
    action: "Created user thinh",
    timestamp: "2025-05-20T12:00:00Z",
    details: null,
  },
  {
    id: "7",
    actor: "thinh",
    action: "Opened MinIO",
    timestamp: "2025-05-21T14:30:00Z",
    details: null,
  },
];

router.get("/audit", requirePermission("audit.view"), async (_req, res): Promise<void> => {
  res.json(GetAuditLogsResponse.parse(mockAuditLogs));
});

export default router;
