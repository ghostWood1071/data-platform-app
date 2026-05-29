CREATE TABLE IF NOT EXISTS "platform_services" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "namespace" text NOT NULL,
  "status" text DEFAULT 'Running' NOT NULL,
  "url" text NOT NULL,
  "category" text NOT NULL,
  "is_jdbc" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "platform_services" (
  "id",
  "name",
  "description",
  "namespace",
  "status",
  "url",
  "category",
  "is_jdbc"
)
VALUES
  ('minio', 'MinIO', 'Object Storage', 'storage', 'Running', 'https://minio.k8s.tailnet', 'storage', false),
  ('notebook', 'JupyterHub', 'Notebook Environment', 'notebook', 'Running', 'https://notebook.k8s.tailnet', 'compute', false),
  ('spark-thrift', 'Spark Thrift Server', 'JDBC/Thrift SQL Gateway', 'compute', 'Running', 'jdbc:hive2://spark-thrift.compute.svc.cluster.local:10000/default', 'compute', true),
  ('spark-ui', 'Spark Cluster UI', 'Spark Master UI', 'compute', 'Running', 'https://spark.k8s.tailnet', 'compute', false),
  ('airflow', 'Apache Airflow', 'Workflow Orchestration', 'orchestration', 'Running', 'https://airflow.k8s.tailnet', 'orchestration', false),
  ('kafka', 'Kafka UI', 'Kafka Management UI', 'streaming', 'Running', 'https://kafka.k8s.tailnet', 'streaming', false),
  ('openmetadata', 'OpenMetadata', 'Metadata Catalog', 'metadata', 'Running', 'https://openmetadata.k8s.tailnet', 'metadata', false)
ON CONFLICT ("id") DO NOTHING;
