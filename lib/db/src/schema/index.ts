import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("users_username_unique").on(table.username),
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
  }),
);

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

export const sparkClusterSettings = pgTable("spark_cluster_settings", {
  id: text("id").primaryKey().default("default"),
  computeNamespace: text("compute_namespace").notNull(),
  sparkClusterImage: text("spark_cluster_image").notNull(),
  sparkVersion: text("spark_version").notNull(),
  pysparkVersion: text("pyspark_version").notNull(),
  hiveMetastoreUris: text("hive_metastore_uris").notNull(),
  s3aEndpoint: text("s3a_endpoint").notNull(),
  sparkWarehouseDir: text("spark_warehouse_dir").notNull(),
  awsAccessKeyId: text("aws_access_key_id").notNull(),
  awsSecretAccessKey: text("aws_secret_access_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SparkClusterOperation = typeof sparkClusterOperations.$inferSelect;
export type NewSparkClusterOperation = typeof sparkClusterOperations.$inferInsert;
export type SparkClusterSettings = typeof sparkClusterSettings.$inferSelect;
export type NewSparkClusterSettings = typeof sparkClusterSettings.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
