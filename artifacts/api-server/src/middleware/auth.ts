import type { NextFunction, Request, Response } from "express";
import {
  SignJWT,
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { eq } from "drizzle-orm";
import { db, users } from "@workspace/db";
import {
  hasAnyRolePermission,
  hasRolePermission,
  isPlatformRole,
  resolvePrimaryRole,
} from "../auth/rbac";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-change-this-secret",
);
const JWT_ISSUER = "data-platform-portal";
const JWT_AUDIENCE = "data-platform-api";

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER_URL?.replace(/\/+$/, "");
const KEYCLOAK_CLIENT_ID =
  process.env.KEYCLOAK_CLIENT_ID || "data-platform-portal";
const KEYCLOAK_ROLE_CLIENT_ID =
  process.env.KEYCLOAK_ROLE_CLIENT_ID || KEYCLOAK_CLIENT_ID;
const KEYCLOAK_JWKS_URI = process.env.KEYCLOAK_JWKS_URI;
const keycloakJwks =
  KEYCLOAK_ISSUER
    ? createRemoteJWKSet(
        new URL(
          KEYCLOAK_JWKS_URI ||
            `${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
        ),
      )
    : null;

export type AuthenticatedUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  roles?: string[];
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
    roles: [user.role],
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

function getClaimString(payload: JWTPayload, claim: string) {
  const value = payload[claim];
  return typeof value === "string" ? value : undefined;
}

function extractKeycloakRoles(payload: JWTPayload) {
  const roles = new Set<string>();
  const realmAccess = payload.realm_access as { roles?: unknown } | undefined;
  if (Array.isArray(realmAccess?.roles)) {
    for (const role of realmAccess.roles) {
      if (typeof role === "string" && isPlatformRole(role)) roles.add(role);
    }
  }

  const resourceAccess = payload.resource_access as
    | Record<string, { roles?: unknown }>
    | undefined;
  const clientAccess = resourceAccess?.[KEYCLOAK_ROLE_CLIENT_ID];
  if (Array.isArray(clientAccess?.roles)) {
    for (const role of clientAccess.roles) {
      if (typeof role === "string" && isPlatformRole(role)) roles.add(role);
    }
  }

  return Array.from(roles);
}

function tokenMatchesClient(payload: JWTPayload) {
  const authorizedParty = getClaimString(payload, "azp");
  if (authorizedParty === KEYCLOAK_CLIENT_ID) return true;

  const audience = payload.aud;
  if (audience === KEYCLOAK_CLIENT_ID) return true;
  if (Array.isArray(audience) && audience.includes(KEYCLOAK_CLIENT_ID)) {
    return true;
  }

  return false;
}

function mapKeycloakUser(payload: JWTPayload): AuthenticatedUser | null {
  if (!payload.sub || !tokenMatchesClient(payload)) return null;

  const roles = extractKeycloakRoles(payload);
  const username =
    getClaimString(payload, "preferred_username") ||
    getClaimString(payload, "email") ||
    payload.sub;
  const fullName =
    getClaimString(payload, "name") ||
    [getClaimString(payload, "given_name"), getClaimString(payload, "family_name")]
      .filter(Boolean)
      .join(" ") ||
    username;

  return {
    id: payload.sub,
    username,
    fullName,
    email: getClaimString(payload, "email") || "",
    role: resolvePrimaryRole(roles),
    roles,
    status: "active",
    createdAt: payload.iat
      ? new Date(payload.iat * 1000).toISOString()
      : new Date(0).toISOString(),
  };
}

async function getKeycloakUserFromToken(token: string) {
  if (!KEYCLOAK_ISSUER || !keycloakJwks) return null;

  try {
    const { payload } = await jwtVerify(token, keycloakJwks, {
      issuer: KEYCLOAK_ISSUER,
    });
    return mapKeycloakUser(payload);
  } catch {
    return null;
  }
}

async function getLegacyUserFromToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
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

export async function getUserFromRequest(req: Request) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice(7);
  if (KEYCLOAK_ISSUER) {
    return getKeycloakUserFromToken(token);
  }

  return getLegacyUserFromToken(token);
}

export function hasPermission(user: AuthenticatedUser, permission: string) {
  if (user.roles?.length) {
    return hasAnyRolePermission(user.roles, permission);
  }
  return hasRolePermission(user.role, permission);
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
