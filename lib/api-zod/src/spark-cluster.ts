import { z } from "zod";

export const SparkClusterSizeSchema = z.enum(["small", "medium", "large"]);
export type SparkClusterSize = z.infer<typeof SparkClusterSizeSchema>;

export const SparkReleaseNameSchema = z.enum([
  "data-exp-small",
  "data-exp-medium",
  "data-exp-large",
]);
export type SparkReleaseName = z.infer<typeof SparkReleaseNameSchema>;

export const SparkClusterActionSchema = z.enum(["START", "STOP", "RESIZE"]);
export type SparkClusterAction = z.infer<typeof SparkClusterActionSchema>;

export const SparkClusterOperationStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
]);
export type SparkClusterOperationStatus = z.infer<
  typeof SparkClusterOperationStatusSchema
>;

export const StartSparkClusterRequestSchema = z.object({
  size: SparkClusterSizeSchema,
});
export type StartSparkClusterRequest = z.infer<
  typeof StartSparkClusterRequestSchema
>;

export const ResizeSparkClusterRequestSchema = z.object({
  replicas: z.number().int().min(0),
});
export type ResizeSparkClusterRequest = z.infer<
  typeof ResizeSparkClusterRequestSchema
>;

export const SparkClusterDtoSchema = z.object({
  releaseName: SparkReleaseNameSchema,
  size: SparkClusterSizeSchema,
  namespace: z.string(),
  status: z.enum(["RUNNING", "STOPPED", "PARTIAL", "UNKNOWN"]),
  masterReplicas: z.number(),
  workerReplicas: z.number(),
  connectReplicas: z.number(),
  maxWorkers: z.number(),
  sparkConnectEndpoint: z.string(),
  lastOperation: z
    .object({
      id: z.string(),
      action: SparkClusterActionSchema,
      status: SparkClusterOperationStatusSchema,
      finishedAt: z.string().nullable(),
    })
    .nullable(),
});
export type SparkClusterDto = z.infer<typeof SparkClusterDtoSchema>;

export const SparkClusterOperationDtoSchema = z.object({
  id: z.string(),
  action: SparkClusterActionSchema,
  releaseName: SparkReleaseNameSchema,
  size: SparkClusterSizeSchema.nullable(),
  replicas: z.number().nullable(),
  status: SparkClusterOperationStatusSchema,
  stdout: z.string().nullable(),
  stderr: z.string().nullable(),
  errorMessage: z.string().nullable(),
  requestedBy: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});
export type SparkClusterOperationDto = z.infer<
  typeof SparkClusterOperationDtoSchema
>;
