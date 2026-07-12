const ADMIN_PERMISSIONS = [
  "*",
  "dashboard.view",
  "about.view",
  "cluster.spark.view",
  "cluster.spark.start",
  "cluster.spark.stop",
  "cluster.spark.scale",
  "spark_cluster:view",
  "spark_cluster:start",
  "spark_cluster:stop",
  "spark_cluster:resize",
  "spark_cluster:settings",
  "service.minio.open",
  "service.notebook.open",
  "service.airflow.open",
  "service.kafka.open",
  "service.openmetadata.open",
  "service.spark-thrift.open",
  "service.spark-ui.open",
  "service.create",
  "service.update",
  "service.delete",
  "user.view",
  "user.create",
  "user.update",
  "user.disable",
  "user.delete",
  "role.view",
  "role.update",
  "audit.view",
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  platform_admin: ADMIN_PERMISSIONS,
  cluster_admin: [
    "dashboard.view",
    "about.view",
    "cluster.spark.view",
    "cluster.spark.start",
    "cluster.spark.stop",
    "cluster.spark.scale",
    "spark_cluster:view",
    "spark_cluster:start",
    "spark_cluster:stop",
    "spark_cluster:resize",
    "spark_cluster:settings",
  ],
  data_engineer: [
    "dashboard.view",
    "about.view",
    "cluster.spark.view",
    "spark_cluster:view",
    "service.minio.open",
    "service.notebook.open",
    "service.airflow.open",
    "service.kafka.open",
    "service.openmetadata.open",
    "service.spark-thrift.open",
    "service.spark-ui.open",
  ],
  analyst: [
    "dashboard.view",
    "about.view",
    "cluster.spark.view",
    "spark_cluster:view",
    "service.notebook.open",
    "service.spark-thrift.open",
  ],
  viewer: ["dashboard.view", "about.view"],
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  platform_admin: "Full access to all platform pages, APIs, and actions",
  cluster_admin: "Can view, start, stop, resize, and configure Spark clusters",
  data_engineer: "Can access data engineering tools and view Spark clusters",
  analyst: "Can access notebooks, Spark Thrift, dashboards, and read-only pages",
  viewer: "Can view dashboard and about pages only",
};

export const PLATFORM_ROLES = Object.keys(ROLE_PERMISSIONS);

const ROLE_PRIORITY = [
  "platform_admin",
  "cluster_admin",
  "data_engineer",
  "analyst",
  "viewer",
];

export function isPlatformRole(role: string): boolean {
  return Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role);
}

export function resolvePrimaryRole(roles: string[]) {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "unassigned";
}

export function permissionsForRole(role: string) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasRolePermission(role: string, permission: string) {
  const permissions = permissionsForRole(role);
  return permissions.includes("*") || permissions.includes(permission);
}

export function hasAnyRolePermission(roles: string[], permission: string) {
  return roles.some((role) => hasRolePermission(role, permission));
}

export function listRolesWithPermissions() {
  return PLATFORM_ROLES.map((name) => ({
    name,
    description: ROLE_DESCRIPTIONS[name] ?? "",
    permissions: permissionsForRole(name),
  }));
}
