import { Router, type IRouter } from "express";
import {
  GetSparkClusterResponse,
  StartSparkClusterResponse,
  StopSparkClusterResponse,
  ScaleSparkClusterResponse,
  GetSparkPodsResponse,
  GetSparkEventsResponse,
} from "@workspace/api-zod";
import { requirePermission } from "../middleware/auth";

const router: IRouter = Router();

// Legacy single-cluster endpoints (kept for backward compatibility)
let clusterState = {
  clusterName: "data-exp-small",
  namespace: "compute",
  masterStatus: "Running",
  workerStatus: "Running",
  currentWorkerReplicas: 3,
  desiredWorkerReplicas: 3,
  sparkMasterUrl: "spark://data-exp-small-master.compute.svc.cluster.local:7077",
  sparkUiUrl: "https://spark.k8s.tailnet",
};

const mockPods = [
  {
    podName: "data-exp-small-master-abc12",
    role: "master" as const,
    status: "Running",
    node: "node-01",
    cpu: "800m",
    memory: "2Gi",
    age: "3d",
  },
  {
    podName: "data-exp-small-worker-1",
    role: "worker" as const,
    status: "Running",
    node: "node-02",
    cpu: "1200m",
    memory: "4Gi",
    age: "3d",
  },
  {
    podName: "data-exp-small-worker-2",
    role: "worker" as const,
    status: "Running",
    node: "node-03",
    cpu: "1100m",
    memory: "4Gi",
    age: "3d",
  },
  {
    podName: "data-exp-small-worker-3",
    role: "worker" as const,
    status: "Running",
    node: "node-01",
    cpu: "950m",
    memory: "4Gi",
    age: "2d",
  },
];

const mockEvents = [
  {
    type: "Normal",
    reason: "Started",
    message: "Spark cluster started successfully",
    timestamp: "2025-05-23T08:00:00Z",
  },
  {
    type: "Normal",
    reason: "Scaled",
    message: "Worker replicas scaled from 2 to 3",
    timestamp: "2025-05-23T08:15:00Z",
  },
  {
    type: "Warning",
    reason: "PodPending",
    message: "Worker pod data-exp-small-worker-3 was pending for 30s",
    timestamp: "2025-05-22T14:10:00Z",
  },
];

// ============================================================
// Multi-cluster state
// ============================================================

interface ClusterProfile {
  clusterName: string;
  namespace: string;
  size: "small" | "medium" | "large";
  status: "RUNNING" | "STOPPED" | "SCALING" | "UNKNOWN";
  currentWorkerReplicas: number;
  desiredWorkerReplicas: number;
  defaultWorkerReplicas: number;
  minWorkers: number;
  maxWorkers: number;
  driverCpu: string;
  driverMemory: string;
  workerCpu: string;
  workerMemory: string;
  sparkMasterUrl: string;
  sparkUiUrl: string;
  executorMemory: string | null;
  executorCores: number | null;
  shufflePartitions: number | null;
  dynamicAllocationEnabled: boolean | null;
}

interface ClusterPod {
  podName: string;
  role: "master" | "worker";
  status: string;
  node: string;
  cpu: string;
  memory: string;
  age: string;
}

const clusters: Map<string, ClusterProfile> = new Map([
  [
    "data-exp-small",
    {
      clusterName: "data-exp-small",
      namespace: "compute",
      size: "small",
      status: "RUNNING",
      currentWorkerReplicas: 1,
      desiredWorkerReplicas: 1,
      defaultWorkerReplicas: 1,
      minWorkers: 0,
      maxWorkers: 2,
      driverCpu: "1 core",
      driverMemory: "2Gi",
      workerCpu: "1 core",
      workerMemory: "2Gi",
      sparkMasterUrl: "spark://data-exp-small-master.compute.svc.cluster.local:7077",
      sparkUiUrl: "https://spark-small.k8s.tailnet",
      executorMemory: "1.5Gi",
      executorCores: 1,
      shufflePartitions: 100,
      dynamicAllocationEnabled: false,
    },
  ],
  [
    "data-exp-medium",
    {
      clusterName: "data-exp-medium",
      namespace: "compute",
      size: "medium",
      status: "RUNNING",
      currentWorkerReplicas: 2,
      desiredWorkerReplicas: 2,
      defaultWorkerReplicas: 2,
      minWorkers: 1,
      maxWorkers: 5,
      driverCpu: "2 cores",
      driverMemory: "4Gi",
      workerCpu: "2 cores",
      workerMemory: "4Gi",
      sparkMasterUrl: "spark://data-exp-medium-master.compute.svc.cluster.local:7077",
      sparkUiUrl: "https://spark-medium.k8s.tailnet",
      executorMemory: "3Gi",
      executorCores: 2,
      shufflePartitions: 200,
      dynamicAllocationEnabled: false,
    },
  ],
  [
    "data-exp-large",
    {
      clusterName: "data-exp-large",
      namespace: "compute",
      size: "large",
      status: "STOPPED",
      currentWorkerReplicas: 0,
      desiredWorkerReplicas: 4,
      defaultWorkerReplicas: 4,
      minWorkers: 2,
      maxWorkers: 10,
      driverCpu: "4 cores",
      driverMemory: "8Gi",
      workerCpu: "4 cores",
      workerMemory: "8Gi",
      sparkMasterUrl: "spark://data-exp-large-master.compute.svc.cluster.local:7077",
      sparkUiUrl: "https://spark-large.k8s.tailnet",
      executorMemory: "6Gi",
      executorCores: 4,
      shufflePartitions: 400,
      dynamicAllocationEnabled: true,
    },
  ],
]);

function getPodsForCluster(name: string): ClusterPod[] {
  const cluster = clusters.get(name);
  if (!cluster) return [];
  const pods: ClusterPod[] = [];

  if (cluster.status !== "STOPPED") {
    pods.push({
      podName: `${name}-master-xyz12`,
      role: "master",
      status: "Running",
      node: "node-01",
      cpu: cluster.driverCpu,
      memory: cluster.driverMemory,
      age: "2d",
    });
    for (let i = 1; i <= cluster.currentWorkerReplicas; i++) {
      pods.push({
        podName: `${name}-worker-${i}`,
        role: "worker",
        status: "Running",
        node: `node-0${(i % 3) + 1}`,
        cpu: cluster.workerCpu,
        memory: cluster.workerMemory,
        age: "2d",
      });
    }
  }
  return pods;
}

// ============================================================
// Legacy endpoints
// ============================================================

router.get("/clusters/spark", requirePermission("cluster.spark.view"), async (_req, res): Promise<void> => {
  res.json(GetSparkClusterResponse.parse(clusterState));
});

router.post("/clusters/spark/start", requirePermission("cluster.spark.start"), async (_req, res): Promise<void> => {
  clusterState.masterStatus = "Running";
  clusterState.workerStatus = "Running";
  res.json(
    StartSparkClusterResponse.parse({
      success: true,
      message: "Spark cluster started successfully",
    }),
  );
});

router.post("/clusters/spark/stop", requirePermission("cluster.spark.stop"), async (_req, res): Promise<void> => {
  clusterState.masterStatus = "Stopped";
  clusterState.workerStatus = "Stopped";
  res.json(
    StopSparkClusterResponse.parse({
      success: true,
      message: "Spark cluster stopped successfully",
    }),
  );
});

router.post("/clusters/spark/scale", requirePermission("cluster.spark.scale"), async (req, res): Promise<void> => {
  const { workerCount } = req.body as { workerCount: number };
  clusterState.desiredWorkerReplicas = workerCount;
  clusterState.currentWorkerReplicas = workerCount;
  res.json(
    ScaleSparkClusterResponse.parse({
      success: true,
      message: `Worker count updated to ${workerCount} successfully`,
    }),
  );
});

router.get("/clusters/spark/pods", requirePermission("cluster.spark.view"), async (_req, res): Promise<void> => {
  res.json(GetSparkPodsResponse.parse(mockPods));
});

router.get("/clusters/spark/events", requirePermission("cluster.spark.view"), async (_req, res): Promise<void> => {
  res.json(GetSparkEventsResponse.parse(mockEvents));
});

// ============================================================
// New multi-cluster endpoints
// ============================================================

router.get("/clusters/spark/list", requirePermission("cluster.spark.view"), async (_req, res): Promise<void> => {
  res.json({ clusters: Array.from(clusters.values()) });
});

router.get("/clusters/spark/:clusterName", requirePermission("cluster.spark.view"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clusterName) ? req.params.clusterName[0] : req.params.clusterName;
  const cluster = clusters.get(raw);
  if (!cluster) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }
  res.json({ cluster, pods: getPodsForCluster(raw) });
});

router.post("/clusters/spark/:clusterName/start", requirePermission("cluster.spark.start"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clusterName) ? req.params.clusterName[0] : req.params.clusterName;
  const cluster = clusters.get(raw);
  if (!cluster) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }

  cluster.status = "RUNNING";
  cluster.currentWorkerReplicas = cluster.defaultWorkerReplicas;
  cluster.desiredWorkerReplicas = cluster.defaultWorkerReplicas;

  res.json({
    success: true,
    message: `${raw} started successfully`,
  });
});

router.post("/clusters/spark/:clusterName/stop", requirePermission("cluster.spark.stop"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clusterName) ? req.params.clusterName[0] : req.params.clusterName;
  const cluster = clusters.get(raw);
  if (!cluster) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }

  cluster.status = "STOPPED";
  cluster.currentWorkerReplicas = 0;

  res.json({
    success: true,
    message: `${raw} stopped successfully`,
  });
});

router.post("/clusters/spark/:clusterName/scale", requirePermission("cluster.spark.scale"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clusterName) ? req.params.clusterName[0] : req.params.clusterName;
  const cluster = clusters.get(raw);
  if (!cluster) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }

  const { workers } = req.body as { workers: number };
  if (workers < cluster.minWorkers || workers > cluster.maxWorkers) {
    res.status(400).json({
      error: `Worker count must be between ${cluster.minWorkers} and ${cluster.maxWorkers} for ${raw}`,
    });
    return;
  }

  cluster.currentWorkerReplicas = workers;
  cluster.desiredWorkerReplicas = workers;

  res.json({
    success: true,
    message: `${raw} scaled to ${workers} workers`,
  });
});

router.put("/clusters/spark/:clusterName/config", requirePermission("spark_cluster:settings"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.clusterName) ? req.params.clusterName[0] : req.params.clusterName;
  const cluster = clusters.get(raw);
  if (!cluster) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }

  const body = req.body as Record<string, unknown>;

  if (body.driverCpu != null) cluster.driverCpu = String(body.driverCpu);
  if (body.driverMemory != null) cluster.driverMemory = String(body.driverMemory);
  if (body.workerCpu != null) cluster.workerCpu = String(body.workerCpu);
  if (body.workerMemory != null) cluster.workerMemory = String(body.workerMemory);
  if (body.executorMemory != null) cluster.executorMemory = String(body.executorMemory);
  if (body.executorCores != null) cluster.executorCores = Number(body.executorCores);
  if (body.shufflePartitions != null) cluster.shufflePartitions = Number(body.shufflePartitions);
  if (body.dynamicAllocationEnabled != null) cluster.dynamicAllocationEnabled = Boolean(body.dynamicAllocationEnabled);
  if (body.desiredWorkerReplicas != null) {
    const count = Number(body.desiredWorkerReplicas);
    if (count >= cluster.minWorkers && count <= cluster.maxWorkers) {
      cluster.desiredWorkerReplicas = count;
      cluster.currentWorkerReplicas = count;
    }
  }

  res.json({
    success: true,
    message: `${raw} configuration saved successfully`,
  });
});

export default router;
