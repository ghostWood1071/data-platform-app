import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, users } from "@workspace/db";
import {
  LoginBody,
  LoginResponse,
  GetCurrentUserResponse,
} from "@workspace/api-zod";
import { verifyPassword } from "../services/password.service";
import { createJwt, getUserFromRequest, mapAuthUser } from "../middleware/auth";

const router: IRouter = Router();

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER_URL?.replace(/\/+$/, "");
const KEYCLOAK_CLIENT_ID =
  process.env.KEYCLOAK_CLIENT_ID || "data-platform-portal";

router.get("/auth/config", async (_req, res): Promise<void> => {
  if (!KEYCLOAK_ISSUER) {
    res.status(503).json({ error: "Keycloak SSO is not configured" });
    return;
  }

  res.json({
    issuer: KEYCLOAK_ISSUER,
    clientId: KEYCLOAK_CLIENT_ID,
    authorizationEndpoint: `${KEYCLOAK_ISSUER}/protocol/openid-connect/auth`,
    tokenEndpoint:
      process.env.KEYCLOAK_PUBLIC_TOKEN_ENDPOINT ||
      `${KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
    endSessionEndpoint: `${KEYCLOAK_ISSUER}/protocol/openid-connect/logout`,
    scope: process.env.KEYCLOAK_SCOPE || "openid profile email roles",
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  if (KEYCLOAK_ISSUER) {
    res.status(410).json({ error: "Password login is disabled; use Keycloak SSO" });
    return;
  }

  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));

  if (
    !user ||
    user.status !== "active" ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const safeUser = mapAuthUser(user);
  const token = await createJwt(safeUser, parsed.data.rememberMe);
  res.json(
    LoginResponse.parse({
      user: safeUser,
      token,
    }),
  );
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  res.json(GetCurrentUserResponse.parse(user));
});

export default router;
