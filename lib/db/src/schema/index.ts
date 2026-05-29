import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

export const sparkClusterOperations = pgTable("spark_cluster_operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(), // START | STOP | RESIZE
  releaseName: text("release_name").notNull(),
  size: text("size"),
  replicas: integer("replicas"),
  status: text("status").notNull(), // PENDING | RUNNING | SUCCESS | FAILED
  stdout: text("stdout"),
  stderr: text("stderr"),
  errorMessage: text("error_message"),
  requestedBy: text("requested_by"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
});

export type SparkClusterOperation = typeof sparkClusterOperations.$inferSelect;
export type NewSparkClusterOperation = typeof sparkClusterOperations.$inferInsert;
