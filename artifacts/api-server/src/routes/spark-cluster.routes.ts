import { Router } from "express";
import {
  SparkReleaseNameSchema,
  StartSparkClusterRequestSchema,
  ResizeSparkClusterRequestSchema,
  UpdateSparkClusterSettingsRequestSchema,
} from "@workspace/api-zod";
import { sparkClusterService } from "../services/spark-cluster.service";
import { sparkClusterStatusService } from "../services/spark-cluster-status.service";
import { SPARK_CLUSTER_CONFIG } from "../config/spark-cluster.config";
import { requirePermission } from "../middleware/auth";

const router = Router();

function getParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// GET /api/spark-clusters
router.get("/", requirePermission("spark_cluster:view"), async (req, res): Promise<any> => {
  try {
    const clusters = await sparkClusterStatusService.getAllClustersStatus();
    return res.json(clusters);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch spark clusters" });
  }
});

// GET /api/spark-clusters/settings
router.get("/settings", requirePermission("spark_cluster:settings"), async (_req, res): Promise<any> => {
  try {
    const settings = await sparkClusterService.getSettings();
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch spark settings" });
  }
});

// PUT /api/spark-clusters/settings
router.put("/settings", requirePermission("spark_cluster:settings"), async (req, res): Promise<any> => {
  try {
    const bodyResult = UpdateSparkClusterSettingsRequestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: bodyResult.error.errors });
    }
    const settings = await sparkClusterService.updateSettings(bodyResult.data);
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update spark settings" });
  }
});

// GET /api/spark-clusters/operations/:operationId
router.get("/operations/:operationId", requirePermission("spark_cluster:view"), async (req, res): Promise<any> => {
  try {
    const operationId = getParamValue(req.params.operationId);
    if (!operationId) {
      return res.status(400).json({ error: "Invalid operation id" });
    }
    const op = await sparkClusterService.getOperation(operationId);
    if (!op) {
      return res.status(404).json({ error: "Operation not found" });
    }
    return res.json(op);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch operation" });
  }
});

// GET /api/spark-clusters/:releaseName
router.get("/:releaseName", requirePermission("spark_cluster:view"), async (req, res): Promise<any> => {
  try {
    const result = SparkReleaseNameSchema.safeParse(req.params.releaseName);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid release name" });
    }
    const cluster = await sparkClusterStatusService.getClusterStatus(
      result.data,
    );
    return res.json(cluster);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch spark cluster" });
  }
});

// POST /api/spark-clusters/:releaseName/start
router.post("/:releaseName/start", requirePermission("spark_cluster:start"), async (req, res): Promise<any> => {
  try {
    const nameResult = SparkReleaseNameSchema.safeParse(req.params.releaseName);
    if (!nameResult.success) {
      return res.status(400).json({ error: "Invalid release name" });
    }

    const bodyResult = StartSparkClusterRequestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: bodyResult.error.errors });
    }

    const releaseName = nameResult.data;
    const size = bodyResult.data.size;

    // Business validation
    if (SPARK_CLUSTER_CONFIG[releaseName as keyof typeof SPARK_CLUSTER_CONFIG].size !== size) {
      return res
        .status(400)
        .json({ error: `Size ${size} does not match release ${releaseName}` });
    }

    const op = await sparkClusterService.createOperation({
      action: "START",
      releaseName,
      size,
    });

    return res.status(202).json({
      operationId: op.id,
      action: "START",
      releaseName,
      status: "PENDING",
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to start spark cluster" });
  }
});

// POST /api/spark-clusters/:releaseName/stop
router.post("/:releaseName/stop", requirePermission("spark_cluster:stop"), async (req, res): Promise<any> => {
  try {
    const nameResult = SparkReleaseNameSchema.safeParse(req.params.releaseName);
    if (!nameResult.success) {
      return res.status(400).json({ error: "Invalid release name" });
    }

    const releaseName = nameResult.data;

    const op = await sparkClusterService.createOperation({
      action: "STOP",
      releaseName,
    });

    return res.status(202).json({
      operationId: op.id,
      action: "STOP",
      releaseName,
      status: "PENDING",
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to stop spark cluster" });
  }
});

// POST /api/spark-clusters/:releaseName/resize
router.post("/:releaseName/resize", requirePermission("spark_cluster:resize"), async (req, res): Promise<any> => {
  try {
    const nameResult = SparkReleaseNameSchema.safeParse(req.params.releaseName);
    if (!nameResult.success) {
      return res.status(400).json({ error: "Invalid release name" });
    }

    const bodyResult = ResizeSparkClusterRequestSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({ error: bodyResult.error.errors });
    }

    const releaseName = nameResult.data;
    const replicas = bodyResult.data.replicas;
    const config = SPARK_CLUSTER_CONFIG[releaseName as keyof typeof SPARK_CLUSTER_CONFIG];

    // Business validation
    if (replicas < config.minWorkers || replicas > config.maxWorkers) {
      return res.status(400).json({
        error: `Replicas must be between ${config.minWorkers} and ${config.maxWorkers}`,
      });
    }

    const op = await sparkClusterService.createOperation({
      action: "RESIZE",
      releaseName,
      replicas,
    });

    return res.status(202).json({
      operationId: op.id,
      action: "RESIZE",
      releaseName,
      replicas,
      status: "PENDING",
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to resize spark cluster" });
  }
});

// GET /api/spark-clusters/:releaseName/operations
router.get("/:releaseName/operations", requirePermission("spark_cluster:view"), async (req, res): Promise<any> => {
  try {
    const nameResult = SparkReleaseNameSchema.safeParse(req.params.releaseName);
    if (!nameResult.success) {
      return res.status(400).json({ error: "Invalid release name" });
    }
    const ops = await sparkClusterService.getOperationsByRelease(
      nameResult.data,
    );
    return res.json(ops);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch operations" });
  }
});

export default router;
