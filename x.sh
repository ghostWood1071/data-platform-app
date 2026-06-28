#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-}"
[[ -n "$MODE" ]] && shift || true

TABLE_NAME=""
RUN_ID="$(date +%Y%m%d%H%M%S)"
SNAPSHOT_NAME=""

KRB_KEYTAB=""
KRB_PRINCIPAL=""

COLUMN_FAMILY=""
ROWKEY_FIELD="rowkey"
ROWKEY_TYPE="string"
DEFAULT_COL_TYPE="string"

GEN_CATALOG_SCRIPT="./gen_hbase_catalog.py"
PYSPARK_FILE="./hbase_export_to_parquet.py"

HBASE_SITE=""
JARS=""

SPARK_MASTER="yarn"
DEPLOY_MODE="client"
NUM_EXECUTORS="4"
EXECUTOR_CORES="2"
DRIVER_CORES="1"
DRIVER_MEMORY="2g"
EXECUTOR_MEMORY="4g"

CONNECTOR_FORMAT="org.apache.hadoop.hbase.spark"
WRITE_MODE="overwrite"
SHOW_SAMPLE_DATA="false"

HDFS_EXPORT_PATH=""

SRC_LOCAL_PARQUET_PATH=""
SRC_HDFS_PARQUET_PATH=""
REG_HDFS_PARQUET_PATH=""
HIVE_DB="regression"
SRC_TABLE=""
REG_TABLE=""
RESULT_TABLE=""
HQL_SCRIPT=""
SPARK_SQL_BIN="spark-sql"





die() {
  echo "ERROR: $*" >&2
  exit 1
}


require_var() {
  local var_name="$1"
  local option_name="$2"

  [[ -n "${!var_name:-}" ]] || die "Missing required option: ${option_name}"
}


safe_name() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9_]+/_/g; s/^_+//; s/_+$//'
}


start_kinit() {
  if [[ -n "$KRB_KEYTAB" || -n "$KRB_PRINCIPAL" ]]; then
    require_var KRB_KEYTAB "--krb-keytab"
    require_var KRB_PRINCIPAL "--krb-principal"

    echo "Kerberos login: ${KRB_PRINCIPAL}"
    kinit -kt "$KRB_KEYTAB" "$KRB_PRINCIPAL"
  fi
}


build_snapshot_name() {
  require_var TABLE_NAME "--table-name"

  if [[ -z "$SNAPSHOT_NAME" ]]; then
    SNAPSHOT_NAME="$(safe_name "$TABLE_NAME")_${RUN_ID}"
  fi
}


run_hbase_shell() {
  local cmd="$1"
  printf "%s\n" "$cmd" | hbase shell -n
}


scan_one_row() {
  require_var TABLE_NAME "--table-name"

  run_hbase_shell "scan '${TABLE_NAME}', {LIMIT => 1}"
}


generate_catalog_json() {
  require_var TABLE_NAME "--table-name"
  require_var COLUMN_FAMILY "--cf"
  require_var GEN_CATALOG_SCRIPT "--gen-catalog-script"

  scan_one_row | python3 "$GEN_CATALOG_SCRIPT" \
    --table-name "$TABLE_NAME" \
    --cf "$COLUMN_FAMILY" \
    --rowkey-field "$ROWKEY_FIELD" \
    --rowkey-type "$ROWKEY_TYPE" \
    --default-col-type "$DEFAULT_COL_TYPE" \
    --output-format json
}


generate_catalog_b64() {
  require_var TABLE_NAME "--table-name"
  require_var COLUMN_FAMILY "--cf"
  require_var GEN_CATALOG_SCRIPT "--gen-catalog-script"

  scan_one_row | python3 "$GEN_CATALOG_SCRIPT" \
    --table-name "$TABLE_NAME" \
    --cf "$COLUMN_FAMILY" \
    --rowkey-field "$ROWKEY_FIELD" \
    --rowkey-type "$ROWKEY_TYPE" \
    --default-col-type "$DEFAULT_COL_TYPE" \
    --output-format b64
}


create_snapshot() {
  require_var TABLE_NAME "--table-name"

  build_snapshot_name
  start_kinit

  echo "Create HBase snapshot:"
  echo "  table    : ${TABLE_NAME}"
  echo "  snapshot : ${SNAPSHOT_NAME}"

  run_hbase_shell "snapshot '${TABLE_NAME}', '${SNAPSHOT_NAME}'"

  echo "Snapshot created successfully."
}


get_catalog() {
  require_var TABLE_NAME "--table-name"
  require_var COLUMN_FAMILY "--cf"

  start_kinit

  echo "Generate catalog from 1 HBase row:"
  echo "  table : ${TABLE_NAME}"
  echo "  cf    : ${COLUMN_FAMILY}"

  generate_catalog_json
}


export_data_hdfs() {
  require_var TABLE_NAME "--table-name"
  require_var COLUMN_FAMILY "--cf"
  require_var HDFS_EXPORT_PATH "--hdfs-export-path"
  require_var HBASE_SITE "--hbase-site"
  require_var JARS "--jars"
  require_var PYSPARK_FILE "--pyspark-file"

  start_kinit

  echo "Generate catalog base64 from HBase scan..."
  local catalog_b64
  catalog_b64="$(generate_catalog_b64)"

  echo "Export HBase table to Parquet:"
  echo "  table       : ${TABLE_NAME}"
  echo "  cf          : ${COLUMN_FAMILY}"
  echo "  output path : ${HDFS_EXPORT_PATH}"

  spark-submit \
    --master "$SPARK_MASTER" \
    --deploy-mode "$DEPLOY_MODE" \
    --num-executors "$NUM_EXECUTORS" \
    --executor-cores "$EXECUTOR_CORES" \
    --driver-cores "$DRIVER_CORES" \
    --driver-memory "$DRIVER_MEMORY" \
    --executor-memory "$EXECUTOR_MEMORY" \
    --files "$HBASE_SITE" \
    --jars "$JARS" \
    "$PYSPARK_FILE" \
      --table-name "$TABLE_NAME" \
      --hbase-site "$(basename "$HBASE_SITE")" \
      --catalog-b64 "$catalog_b64" \
      --hdfs-export-path "$HDFS_EXPORT_PATH" \
      --connector-format "$CONNECTOR_FORMAT" \
      --write-mode "$WRITE_MODE" \
      --show-sample-data "$SHOW_SAMPLE_DATA"

  echo "Export completed."
}


start_regression() {
  require_var SRC_LOCAL_PARQUET_PATH "--src-local-parquet-path"
  require_var SRC_HDFS_PARQUET_PATH "--src-hdfs-parquet-path"
  require_var REG_HDFS_PARQUET_PATH "--reg-hdfs-parquet-path"
  require_var HQL_SCRIPT "--hql-script"

  start_kinit

  local base
  base="$(safe_name "${TABLE_NAME:-hbase_table}")"

  SRC_TABLE="${SRC_TABLE:-${base}_src_${RUN_ID}}"
  REG_TABLE="${REG_TABLE:-${base}_reg_${RUN_ID}}"
  RESULT_TABLE="${RESULT_TABLE:-${base}_result_${RUN_ID}}"

  echo "Upload source Parquet to regression HDFS:"
  echo "  local : ${SRC_LOCAL_PARQUET_PATH}"
  echo "  hdfs  : ${SRC_HDFS_PARQUET_PATH}"

  hdfs dfs -rm -r -f "$SRC_HDFS_PARQUET_PATH" >/dev/null 2>&1 || true
  hdfs dfs -mkdir -p "$SRC_HDFS_PARQUET_PATH"
  hdfs dfs -put -f "${SRC_LOCAL_PARQUET_PATH%/}/"* "$SRC_HDFS_PARQUET_PATH"/

  echo "Create external Spark SQL tables from Parquet."

  "$SPARK_SQL_BIN" -e "
CREATE DATABASE IF NOT EXISTS ${HIVE_DB};

DROP TABLE IF EXISTS ${HIVE_DB}.${SRC_TABLE};
CREATE TABLE ${HIVE_DB}.${SRC_TABLE}
USING parquet
LOCATION '${SRC_HDFS_PARQUET_PATH}';

DROP TABLE IF EXISTS ${HIVE_DB}.${REG_TABLE};
CREATE TABLE ${HIVE_DB}.${REG_TABLE}
USING parquet
LOCATION '${REG_HDFS_PARQUET_PATH}';
"

  echo "Run compare SQL:"
  echo "  ${HQL_SCRIPT}"

  "$SPARK_SQL_BIN" \
    --hivevar db="$HIVE_DB" \
    --hivevar src_table="$SRC_TABLE" \
    --hivevar reg_table="$REG_TABLE" \
    --hivevar result_table="$RESULT_TABLE" \
    --hivevar run_id="$RUN_ID" \
    -f "$HQL_SCRIPT"

  echo "Regression completed:"
  echo "  db           : ${HIVE_DB}"
  echo "  src table    : ${SRC_TABLE}"
  echo "  reg table    : ${REG_TABLE}"
  echo "  result table : ${RESULT_TABLE}"
}


while [[ $# -gt 0 ]]; do
  case "$1" in
    --table-name) TABLE_NAME="$2"; shift 2 ;;
    --run-id) RUN_ID="$2"; shift 2 ;;
    --snapshot-name) SNAPSHOT_NAME="$2"; shift 2 ;;

    --krb-keytab) KRB_KEYTAB="$2"; shift 2 ;;
    --krb-principal) KRB_PRINCIPAL="$2"; shift 2 ;;

    --cf) COLUMN_FAMILY="$2"; shift 2 ;;
    --rowkey-field) ROWKEY_FIELD="$2"; shift 2 ;;
    --rowkey-type) ROWKEY_TYPE="$2"; shift 2 ;;
    --default-col-type) DEFAULT_COL_TYPE="$2"; shift 2 ;;
    --gen-catalog-script) GEN_CATALOG_SCRIPT="$2"; shift 2 ;;

    --pyspark-file) PYSPARK_FILE="$2"; shift 2 ;;
    --hbase-site) HBASE_SITE="$2"; shift 2 ;;
    --jars) JARS="$2"; shift 2 ;;
    --spark-master) SPARK_MASTER="$2"; shift 2 ;;
    --deploy-mode) DEPLOY_MODE="$2"; shift 2 ;;
    --num-executors) NUM_EXECUTORS="$2"; shift 2 ;;
    --executor-cores) EXECUTOR_CORES="$2"; shift 2 ;;
    --driver-cores) DRIVER_CORES="$2"; shift 2 ;;
    --driver-memory) DRIVER_MEMORY="$2"; shift 2 ;;
    --executor-memory) EXECUTOR_MEMORY="$2"; shift 2 ;;
    --connector-format) CONNECTOR_FORMAT="$2"; shift 2 ;;
    --write-mode) WRITE_MODE="$2"; shift 2 ;;
    --show-sample-data) SHOW_SAMPLE_DATA="$2"; shift 2 ;;

    --hdfs-export-path) HDFS_EXPORT_PATH="$2"; shift 2 ;;

    --src-local-parquet-path) SRC_LOCAL_PARQUET_PATH="$2"; shift 2 ;;
    --src-hdfs-parquet-path) SRC_HDFS_PARQUET_PATH="$2"; shift 2 ;;
    --reg-hdfs-parquet-path) REG_HDFS_PARQUET_PATH="$2"; shift 2 ;;
    --hive-db) HIVE_DB="$2"; shift 2 ;;
    --src-table) SRC_TABLE="$2"; shift 2 ;;
    --reg-table) REG_TABLE="$2"; shift 2 ;;
    --result-table) RESULT_TABLE="$2"; shift 2 ;;
    --hql-script) HQL_SCRIPT="$2"; shift 2 ;;
    --spark-sql-bin) SPARK_SQL_BIN="$2"; shift 2 ;;
    *) die "Unknown option: $1" ;;
  esac
done


case "$MODE" in
  snapshot) create_snapshot ;;
  catalog) get_catalog ;;
  export) export_data_hdfs;;
  regression) start_regression ;;
  *) die "Unknown mode: ${MODE}" ;;
esac