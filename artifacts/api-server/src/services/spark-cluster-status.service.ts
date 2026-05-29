import * as k8s from "@kubernetes/client-node";
import { logger } from "../lib/logger";
import { SparkClusterDto, SparkReleaseName } from "@workspace/api-zod";
import { SPARK_CLUSTER_CONFIG } from "../config/spark-cluster.config";
import { db, sparkClusterOperations } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

export class SparkClusterStatusService {
  private appsApi: k8s.AppsV1Api;
  private kc: k8s.KubeConfig;

  constructor() {
    this.kc = new k8s.KubeConfig();
    try {
      this.kc.loadFromDefault();
    } catch (e) {
      logger.warn("Failed to load kubeconfig, cluster status may be unavailable");
    }
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
  }

  async getClusterStatus(
    releaseName: SparkReleaseName,
  ): Promise<SparkClusterDto> {
    const config = SPARK_CLUSTER_CONFIG[releaseName];
    const namespace = config.namespace;

    let masterReplicas = 0;
    let connectReplicas = 0;
    let workerReplicas = 0;
    let statusUnavailable = false;

    try {
      [masterReplicas, connectReplicas, workerReplicas] = await Promise.all([
        this.readDeploymentReadyReplicas(`${releaseName}-master`, namespace),
        this.readDeploymentReadyReplicas(`${releaseName}-connect`, namespace),
        this.readStatefulSetReadyReplicas(`${releaseName}-worker`, namespace),
      ]);
    } catch (error) {
      statusUnavailable = true;
      logger.error(
        { error, releaseName },
        "Failed to read Spark cluster status from Kubernetes",
      );
    }

    let status: "RUNNING" | "STOPPED" | "PARTIAL" | "UNKNOWN" = "UNKNOWN";
    if (statusUnavailable) {
      status = "UNKNOWN";
    } else if (masterReplicas > 0 && workerReplicas > 0 && connectReplicas > 0) {
      status = "RUNNING";
    } else if (
      masterReplicas === 0 &&
      workerReplicas === 0 &&
      connectReplicas === 0
    ) {
      status = "STOPPED";
    } else {
      status = "PARTIAL";
    }

    // Get last operation from DB
    const lastOps = await db
      .select()
      .from(sparkClusterOperations)
      .where(eq(sparkClusterOperations.releaseName, releaseName))
      .orderBy(desc(sparkClusterOperations.createdAt))
      .limit(1);

    const lastOp = lastOps[0];

    return {
      releaseName,
      size: config.size,
      namespace,
      status,
      masterReplicas,
      workerReplicas,
      connectReplicas,
      maxWorkers: config.maxWorkers,
      sparkConnectEndpoint: `sc://${releaseName}-connect.${namespace}.svc.cluster.local:15002`,
      lastOperation: lastOp
        ? {
            id: lastOp.id,
            action: lastOp.action as any,
            status: lastOp.status as any,
            finishedAt: lastOp.finishedAt ? lastOp.finishedAt.toISOString() : null,
          }
        : null,
    };
  }

  async getAllClustersStatus(): Promise<SparkClusterDto[]> {
    const releaseNames = Object.keys(
      SPARK_CLUSTER_CONFIG,
    ) as SparkReleaseName[];
    return Promise.all(releaseNames.map((name) => this.getClusterStatus(name)));
  }

  private async readDeploymentReadyReplicas(
    name: string,
    namespace: string,
  ): Promise<number> {
    try {
      const deployment = await this.appsApi.readNamespacedDeployment({
        name,
        namespace,
      });
      return deployment.status?.readyReplicas ?? 0;
    } catch (error) {
      if (this.isNotFound(error)) return 0;
      logger.warn({ error, name, namespace }, "Kubernetes deployment status read failed");
      throw error;
    }
  }

  private async readStatefulSetReadyReplicas(
    name: string,
    namespace: string,
  ): Promise<number> {
    try {
      const statefulSet = await this.appsApi.readNamespacedStatefulSet({
        name,
        namespace,
      });
      return statefulSet.status?.readyReplicas ?? 0;
    } catch (error) {
      if (this.isNotFound(error)) return 0;
      logger.warn({ error, name, namespace }, "Kubernetes statefulset status read failed");
      throw error;
    }
  }

  private isNotFound(error: unknown): boolean {
    const statusCode =
      (error as { code?: number }).code ??
      (error as { statusCode?: number }).statusCode ??
      (error as { response?: { statusCode?: number; status?: number } }).response
        ?.statusCode ??
      (error as { response?: { status?: number } }).response?.status;
    return statusCode === 404;
  }
}

export const sparkClusterStatusService = new SparkClusterStatusService();
