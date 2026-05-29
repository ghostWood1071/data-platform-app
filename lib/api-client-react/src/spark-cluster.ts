import { customFetch } from "./custom-fetch";
import {
  SparkClusterDto,
  SparkClusterOperationDto,
  StartSparkClusterRequest,
  ResizeSparkClusterRequest,
  SparkReleaseName,
} from "@workspace/api-zod";

export type {
  SparkClusterDto,
  SparkClusterOperationDto,
  StartSparkClusterRequest,
  ResizeSparkClusterRequest,
  SparkReleaseName,
} from "@workspace/api-zod";

export const getSparkClustersList = () => {
  return customFetch<SparkClusterDto[]>("/api/spark-clusters");
};

export const getSparkClusters = getSparkClustersList;

export const getSparkClusterStatus = (releaseName: SparkReleaseName) => {
  return customFetch<SparkClusterDto>(`/api/spark-clusters/${releaseName}`);
};

export const getSparkCluster = getSparkClusterStatus;

export const startSparkClusterAction = (
  releaseName: SparkReleaseName,
  payload: StartSparkClusterRequest,
) => {
  return customFetch<any>(`/api/spark-clusters/${releaseName}/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const startSparkCluster = startSparkClusterAction;

export const stopSparkClusterAction = (releaseName: SparkReleaseName) => {
  return customFetch<any>(`/api/spark-clusters/${releaseName}/stop`, {
    method: "POST",
  });
};

export const stopSparkCluster = stopSparkClusterAction;

export const resizeSparkClusterAction = (
  releaseName: SparkReleaseName,
  payload: ResizeSparkClusterRequest,
) => {
  return customFetch<any>(`/api/spark-clusters/${releaseName}/resize`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const resizeSparkCluster = resizeSparkClusterAction;

export const getSparkClusterOperationStatus = (operationId: string) => {
  return customFetch<SparkClusterOperationDto>(
    `/api/spark-clusters/operations/${operationId}`,
  );
};

export const getSparkClusterOperation = getSparkClusterOperationStatus;

export const getSparkClusterOperationsList = (releaseName: SparkReleaseName) => {
  return customFetch<SparkClusterOperationDto[]>(
    `/api/spark-clusters/${releaseName}/operations`,
  );
};

export const getSparkClusterOperations = getSparkClusterOperationsList;
