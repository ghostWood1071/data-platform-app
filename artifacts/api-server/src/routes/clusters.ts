import { Router, type IRouter } from "express";
import {
  ScaleSparkClusterBody,
  GetSparkClusterResponse,
  StartSparkClusterResponse,
  StopSparkClusterResponse,
  ScaleSparkClusterResponse,
  GetSparkPodsResponse,
  GetSparkEventsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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

router.get("/clusters/spark", async (_req, res): Promise<void> => {
  res.json(GetSparkClusterResponse.parse(clusterState));
});

router.post("/clusters/spark/start", async (_req, res): Promise<void> => {
  clusterState.masterStatus = "Running";
  clusterState.workerStatus = "Running";
  res.json(
    StartSparkClusterResponse.parse({
      success: true,
      message: "Spark cluster started successfully",
    }),
  );
});

router.post("/clusters/spark/stop", async (_req, res): Promise<void> => {
  clusterState.masterStatus = "Stopped";
  clusterState.workerStatus = "Stopped";
  res.json(
    StopSparkClusterResponse.parse({
      success: true,
      message: "Spark cluster stopped successfully",
    }),
  );
});

router.post("/clusters/spark/scale", async (req, res): Promise<void> => {
  const parsed = ScaleSparkClusterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  clusterState.desiredWorkerReplicas = parsed.data.workerCount;
  clusterState.currentWorkerReplicas = parsed.data.workerCount;

  res.json(
    ScaleSparkClusterResponse.parse({
      success: true,
      message: `Worker count updated to ${parsed.data.workerCount} successfully`,
    }),
  );
});

router.get("/clusters/spark/pods", async (_req, res): Promise<void> => {
  res.json(GetSparkPodsResponse.parse(mockPods));
});

router.get("/clusters/spark/events", async (_req, res): Promise<void> => {
  res.json(GetSparkEventsResponse.parse(mockEvents));
});

export default router;
