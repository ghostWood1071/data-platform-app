import { Router, type IRouter } from "express";
import { GetRolesResponse } from "@workspace/api-zod";
import { listRolesWithPermissions } from "../auth/rbac";
import { requirePermission } from "../middleware/auth";

const router: IRouter = Router();

router.get("/roles", requirePermission("role.view"), async (_req, res): Promise<void> => {
  res.json(GetRolesResponse.parse(listRolesWithPermissions()));
});

export default router;
