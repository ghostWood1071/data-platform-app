import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  CreateServiceBody,
  CreateServiceResponse,
  DeleteServiceParams,
  GetServicesResponse,
  UpdateServiceBody,
  UpdateServiceParams,
  UpdateServiceResponse,
} from "@workspace/api-zod";
import { db, platformServices } from "@workspace/db";
import { requirePermission } from "../middleware/auth";

const router: IRouter = Router();

type ServiceRow = typeof platformServices.$inferSelect;

function mapService(service: ServiceRow) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    namespace: service.namespace,
    status: service.status as "Running" | "Stopped" | "Unknown",
    url: service.url,
    category: service.category,
    isJdbc: service.isJdbc,
  };
}

function isUniqueViolation(error: unknown) {
  return (error as { code?: string }).code === "23505";
}

router.get("/services", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(platformServices)
    .orderBy(asc(platformServices.category), asc(platformServices.name));

  res.json(GetServicesResponse.parse(rows.map(mapService)));
});

router.post(
  "/services",
  requirePermission("service.create"),
  async (req, res): Promise<void> => {
    const parsed = CreateServiceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    try {
      const [created] = await db
        .insert(platformServices)
        .values({
          ...parsed.data,
          isJdbc: parsed.data.isJdbc ?? false,
        })
        .returning();

      res.status(201).json(CreateServiceResponse.parse(mapService(created)));
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Service id already exists" });
        return;
      }
      throw error;
    }
  },
);

router.patch(
  "/services/:id",
  requirePermission("service.update"),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const params = UpdateServiceParams.safeParse({ id: rawId });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateServiceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(platformServices)
      .set({
        ...(parsed.data.name != null ? { name: parsed.data.name } : {}),
        ...(parsed.data.description != null ? { description: parsed.data.description } : {}),
        ...(parsed.data.namespace != null ? { namespace: parsed.data.namespace } : {}),
        ...(parsed.data.status != null ? { status: parsed.data.status } : {}),
        ...(parsed.data.url != null ? { url: parsed.data.url } : {}),
        ...(parsed.data.category != null ? { category: parsed.data.category } : {}),
        ...(parsed.data.isJdbc != null ? { isJdbc: parsed.data.isJdbc } : {}),
        updatedAt: new Date(),
      })
      .where(eq(platformServices.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.json(UpdateServiceResponse.parse(mapService(updated)));
  },
);

router.delete(
  "/services/:id",
  requirePermission("service.delete"),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const params = DeleteServiceParams.safeParse({ id: rawId });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [deleted] = await db
      .delete(platformServices)
      .where(eq(platformServices.id, params.data.id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    res.status(204).send();
  },
);

export default router;
