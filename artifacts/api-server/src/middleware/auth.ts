import type { NextFunction, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db, users } from "@workspace/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-change-this-secret",
);
const JWT_ISSUER = "data-platform-portal";
const JWT_AUDIENCE = "data-platform-api";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  platform_admin: ["*"],
  cluster_admin: [
    "dashboard.view",
    "about.view",
    "spark_cluster:view",
    "spark_cluster:start",
    "spark_cluster:stop",
    "spark_cluster:resize",
    "spark_cluster:settings",
  ],
  data_engineer: [
    "dashboard.view",
    "about.view",
    "spark_cluster:view",
    "service.minio.open",
    "service.notebook.open",
    "service.airflow.open",
    "service.kafka.open",
    "service.openmetadata.open",
  ],
  analyst: [
    "dashboard.view",
    "about.view",
    "spark_cluster:view",
    "service.notebook.open",
    "service.spark-thrift.open",
  ],
  viewer: ["dashboard.view", "about.view"],
};

export type AuthenticatedUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: "active" | "disabled";
  createdAt: string;
};

export function mapAuthUser(user: typeof users.$inferSelect): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status as "active" | "disabled",
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createJwt(
  user: AuthenticatedUser,
  rememberMe?: boolean,
) {
  return new SignJWT({
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(rememberMe ? "30d" : "8h")
    .sign(JWT_SECRET);
}

export async function getUserFromRequest(req: Request) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;

  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const userId = payload.sub;
    if (!userId) return null;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user && user.status === "active" ? mapAuthUser(user) : null;
  } catch {
    return null;
  }
}

export function hasPermission(user: AuthenticatedUser, permission: string) {
  const permissions = ROLE_PERMISSIONS[user.role] ?? [];
  return permissions.includes("*") || permissions.includes(permission);
}

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    res.locals.user = user;
    next();
  };
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    if (!hasPermission(user, permission)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.locals.user = user;
    next();
  };
}
