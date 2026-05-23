import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

type UserStatus = "active" | "disabled";

interface MockUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: UserStatus;
  createdAt: string;
}

const mockUsers: MockUser[] = [
  {
    id: "1",
    username: "admin",
    fullName: "Administrator",
    email: "admin@platform.local",
    role: "platform_admin",
    status: "active",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    username: "thinh",
    fullName: "Thinh Nguyen",
    email: "thinh@platform.local",
    role: "data_engineer",
    status: "active",
    createdAt: "2025-02-01T00:00:00Z",
  },
  {
    id: "3",
    username: "analyst1",
    fullName: "Data Analyst",
    email: "analyst1@platform.local",
    role: "analyst",
    status: "active",
    createdAt: "2025-03-01T00:00:00Z",
  },
  {
    id: "4",
    username: "viewer1",
    fullName: "Viewer User",
    email: "viewer1@platform.local",
    role: "viewer",
    status: "active",
    createdAt: "2025-04-01T00:00:00Z",
  },
];

let nextId = 5;

router.get("/users", async (_req, res): Promise<void> => {
  res.json(GetUsersResponse.parse(mockUsers));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const newUser: MockUser = {
    id: String(nextId++),
    username: parsed.data.username,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    role: parsed.data.role,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  mockUsers.push(newUser);
  res.status(201).json(GetUserResponse.parse(newUser));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = mockUsers.find((u) => u.id === params.data.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetUserResponse.parse(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
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

  const idx = mockUsers.findIndex((u) => u.id === params.data.id);
  if (idx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (parsed.data.fullName != null) mockUsers[idx].fullName = parsed.data.fullName;
  if (parsed.data.email != null) mockUsers[idx].email = parsed.data.email;
  if (parsed.data.role != null) mockUsers[idx].role = parsed.data.role;

  res.json(UpdateUserResponse.parse(mockUsers[idx]));
});

router.post("/users/:id/toggle", async (req, res): Promise<void> => {
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

  const idx = mockUsers.findIndex((u) => u.id === params.data.id);
  if (idx === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  mockUsers[idx].status = parsed.data.enabled ? "active" : "disabled";
  res.json(ToggleUserStatusResponse.parse(mockUsers[idx]));
});

export default router;
