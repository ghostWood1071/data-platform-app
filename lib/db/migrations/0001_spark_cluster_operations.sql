CREATE TABLE IF NOT EXISTS "spark_cluster_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action" text NOT NULL,
  "release_name" text NOT NULL,
  "size" text,
  "replicas" integer,
  "status" text NOT NULL,
  "stdout" text,
  "stderr" text,
  "error_message" text,
  "requested_by" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "started_at" timestamp,
  "finished_at" timestamp
);
