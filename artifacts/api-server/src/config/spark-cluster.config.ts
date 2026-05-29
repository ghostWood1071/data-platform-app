export const SPARK_CLUSTER_CONFIG = {
  "data-exp-small": {
    releaseName: "data-exp-small",
    size: "small",
    namespace: "compute",
    minWorkers: 0,
    maxWorkers: 2,
    defaultWorkers: 1,
  },
  "data-exp-medium": {
    releaseName: "data-exp-medium",
    size: "medium",
    namespace: "compute",
    minWorkers: 0,
    maxWorkers: 4,
    defaultWorkers: 2,
  },
  "data-exp-large": {
    releaseName: "data-exp-large",
    size: "large",
    namespace: "compute",
    minWorkers: 0,
    maxWorkers: 8,
    defaultWorkers: 3,
  },
} as const;

export type SparkClusterConfigKey = keyof typeof SPARK_CLUSTER_CONFIG;
