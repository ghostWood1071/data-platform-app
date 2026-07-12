import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  GetUsersResponse,
  GetUserParams,
  GetUserResponse,
  UpdateUserParams,
  UpdateUserBody,
  UpdateUserResponse,
  ToggleUserStatusParams,
  ToggleUserStatusBody,
  ToggleUserStatusResponse,
  CreateUserBody,
} from "@workspace/api-zod";
import { db, users } from "@workspace/db";
import { hashPassword } from "../services/password.service";
import { requirePermission } from "../middleware/auth";
import {
  isKeycloakAdminConfigured,
  keycloakAdminService,
} from "../services/keycloak-admin.service";

const router: IRouter = Router();

type DbUser = typeof users.$inferSelect;

function mapUser(user: DbUser) {
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

function isUniqueViolation(error: unknown) {
  return (error as { code?: string }).code === "23505";
}

router.get("/users", requirePermission("user.view"), async (_req, res): Promise<void> => {
  if (isKeycloakAdminConfigured()) {
    const rows = await keycloakAdminService.listUsers();
    res.json(GetUsersResponse.parse(rows));
    return;
  }

  const rows = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));
  res.json(GetUsersResponse.parse(rows.map(mapUser)));
});

router.post("/users", requirePermission("user.create"), async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isKeycloakAdminConfigured()) {
    const created = await keycloakAdminService.createUser(parsed.data);
    res.status(201).json(GetUserResponse.parse(created));
    return;
  }

  try {
    const [created] = await db
      .insert(users)
      .values({
        username: parsed.data.username,
        passwordHash: await hashPassword(parsed.data.password || parsed.data.username),
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        role: parsed.data.role,
        status: "active",
      })
      .returning();

    res.status(201).json(GetUserResponse.parse(mapUser(created)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "Username or email already exists" });
      return;
    }
    throw error;
  }
});

router.get("/users/:id", requirePermission("user.view"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isKeycloakAdminConfigured()) {
    const user = await keycloakAdminService.getUser(params.data.id);
    res.json(GetUserResponse.parse(user));
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetUserResponse.parse(mapUser(user)));
});

router.patch("/users/:id", requirePermission("user.update"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateUserParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isKeycloakAdminConfigured()) {
    const updated = await keycloakAdminService.updateUser(params.data.id, parsed.data);
    res.json(UpdateUserResponse.parse(updated));
    return;
  }

  try {
    const [updated] = await db
      .update(users)
      .set({
        ...(parsed.data.fullName != null ? { fullName: parsed.data.fullName } : {}),
        ...(parsed.data.email != null ? { email: parsed.data.email } : {}),
        ...(parsed.data.role != null ? { role: parsed.data.role } : {}),
        ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(UpdateUserResponse.parse(mapUser(updated)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "Username or email already exists" });
      return;
    }
    throw error;
  }
});

router.post("/users/:id/toggle", requirePermission("user.disable"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ToggleUserStatusParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ToggleUserStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (isKeycloakAdminConfigured()) {
    const updated = await keycloakAdminService.setUserEnabled(
      params.data.id,
      parsed.data.enabled,
    );
    res.json(ToggleUserStatusResponse.parse(updated));
    return;
  }

  const [updated] = await db
    .update(users)
    .set({
      status: parsed.data.enabled ? "active" : "disabled",
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(ToggleUserStatusResponse.parse(mapUser(updated)));
});

router.delete("/users/:id", requirePermission("user.delete"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (isKeycloakAdminConfigured()) {
    await keycloakAdminService.deleteUser(params.data.id);
    res.status(204).send();
    return;
  }

  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.status(204).send();
});

export default router;
