CREATE TABLE IF NOT EXISTS "spark_cluster_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "compute_namespace" text NOT NULL,
  "spark_cluster_image" text NOT NULL,
  "spark_version" text NOT NULL,
  "pyspark_version" text NOT NULL,
  "hive_metastore_uris" text NOT NULL,
  "s3a_endpoint" text NOT NULL,
  "spark_warehouse_dir" text NOT NULL,
  "aws_access_key_id" text NOT NULL,
  "aws_secret_access_key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "spark_cluster_settings" (
  "id",
  "compute_namespace",
  "spark_cluster_image",
  "spark_version",
  "pyspark_version",
  "hive_metastore_uris",
  "s3a_endpoint",
  "spark_warehouse_dir",
  "aws_access_key_id",
  "aws_secret_access_key"
)
VALUES (
  'default',
  'compute',
  'ghostwood/spark-notebook:0.0.3',
  '3.5.7',
  '3.5.7',
  'thrift://hive-metastore.metastore.svc.cluster.local:9083',
  'http://minio-svc-private.storage.svc.cluster.local:9000',
  's3a://warehouse/',
  'minioadmin',
  'minioadmin'
)
ON CONFLICT ("id") DO NOTHING;
