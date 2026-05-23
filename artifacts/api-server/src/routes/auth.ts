import { Router, type IRouter } from "express";
import {
  LoginBody,
  LoginResponse,
  GetCurrentUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const MOCK_USERS = [
  {
    id: "1",
    username: "admin",
    password: "admin",
    fullName: "Administrator",
    email: "admin@platform.local",
    role: "platform_admin",
    status: "active" as const,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    username: "thinh",
    password: "thinh",
    fullName: "Thinh Nguyen",
    email: "thinh@platform.local",
    role: "data_engineer",
    status: "active" as const,
    createdAt: "2025-02-01T00:00:00Z",
  },
  {
    id: "3",
    username: "analyst1",
    password: "analyst1",
    fullName: "Data Analyst",
    email: "analyst1@platform.local",
    role: "analyst",
    status: "active" as const,
    createdAt: "2025-03-01T00:00:00Z",
  },
  {
    id: "4",
    username: "viewer1",
    password: "viewer1",
    fullName: "Viewer User",
    email: "viewer1@platform.local",
    role: "viewer",
    status: "active" as const,
    createdAt: "2025-04-01T00:00:00Z",
  },
];

const sessions: Map<string, string> = new Map();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const user = MOCK_USERS.find(
    (u) => u.username === username && u.password === password,
  );

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = `mock-token-${user.id}-${Date.now()}`;
  sessions.set(token, user.id);

  const { password: _pw, ...safeUser } = user;
  res.json(
    LoginResponse.parse({
      user: safeUser,
      token,
    }),
  );
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    sessions.delete(auth.slice(7));
  }
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = auth.slice(7);
  const userId = sessions.get(token);

  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const { password: _pw, ...safeUser } = user;
  res.json(GetCurrentUserResponse.parse(safeUser));
});

export default router;
