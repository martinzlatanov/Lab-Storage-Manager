import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreateContainerBody = z.object({
  barcode: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  notes: z.string().optional(),
  locationId: z.string().optional(),
  externalLocationId: z.string().optional(),
}).refine(
  (data) => !(data.locationId && data.externalLocationId),
  { message: "A container cannot be at both an internal and external location" }
);

const UpdateContainerBody = z.object({
  label: z.string().min(1).max(200).optional(),
  notes: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  externalLocationId: z.string().nullable().optional(),
}).refine(
  (data) => !(data.locationId && data.externalLocationId),
  { message: "A container cannot be at both an internal and external location" }
);

const ListContainersQuery = z.object({
  locationId: z.string().optional(),
  externalLocationId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function containersRoutes(app: FastifyInstance) {
  // ── GET /api/v1/containers ─────────────────────────────────────────────────
  app.get(
    "/containers",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = ListContainersQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ success: false, error: "Invalid query parameters" });
      }

      const { locationId, externalLocationId, search, page, pageSize } = query.data;
      const skip = (page - 1) * pageSize;

      const where = {
        ...(locationId ? { locationId } : {}),
        ...(externalLocationId ? { externalLocationId } : {}),
        ...(search
          ? {
              OR: [
                { barcode: { contains: search, mode: "insensitive" as const } },
                { label: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [containers, total] = await Promise.all([
        prisma.container.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            location: {
              include: { storageArea: { include: { building: { include: { site: true } } } } },
            },
            externalLocation: true,
            _count: { select: { items: true } },
          },
        }),
        prisma.container.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: containers,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      });
    }
  );

  // ── POST /api/v1/containers ────────────────────────────────────────────────
  app.post(
    "/containers",
    { preHandler: [app.authenticate, app.requireRole("USER", "ADMIN")] },
    async (req, reply) => {
      const body = CreateContainerBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const { barcode, label, notes, locationId, externalLocationId } = body.data;

      // Check barcode uniqueness
      const existing = await prisma.container.findUnique({ where: { barcode } });
      if (existing) {
        return reply.status(409).send({ success: false, error: "A container with this barcode already exists" });
      }

      // Validate referenced location exists
      if (locationId) {
        const location = await prisma.storageLocation.findUnique({ where: { id: locationId } });
        if (!location) {
          return reply.status(404).send({ success: false, error: "Storage location not found" });
        }
      }

      if (externalLocationId) {
        const extLocation = await prisma.externalLocation.findUnique({ where: { id: externalLocationId } });
        if (!extLocation) {
          return reply.status(404).send({ success: false, error: "External location not found" });
        }
      }

      const container = await prisma.container.create({
        data: { barcode, label, notes, locationId, externalLocationId },
        include: {
          location: true,
          externalLocation: true,
          _count: { select: { items: true } },
        },
      });

      return reply.status(201).send({ success: true, data: container });
    }
  );

  // ── GET /api/v1/containers/scan/:barcode ──────────────────────────────────
  // NOTE: must be registered before /:id to avoid route conflict
  app.get(
    "/containers/scan/:barcode",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { barcode } = req.params as { barcode: string };

      const container = await prisma.container.findUnique({
        where: { barcode },
        include: {
          location: {
            include: { storageArea: { include: { building: { include: { site: true } } } } },
          },
          externalLocation: true,
          _count: { select: { items: true } },
        },
      });

      if (!container) {
        return reply.status(404).send({ success: false, error: "Container not found" });
      }

      return reply.send({ success: true, data: container });
    }
  );

  // ── GET /api/v1/containers/:id ─────────────────────────────────────────────
  app.get(
    "/containers/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const container = await prisma.container.findUnique({
        where: { id },
        include: {
          location: {
            include: { storageArea: { include: { building: { include: { site: true } } } } },
          },
          externalLocation: true,
          items: {
            where: { status: { not: "SCRAPPED" } },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              barcode: true,
              itemType: true,
              status: true,
              labIdNumber: true,
              productName: true,
              miscName: true,
              manufacturer: true,
              createdAt: true,
            },
          },
        },
      });

      if (!container) {
        return reply.status(404).send({ success: false, error: "Container not found" });
      }

      return reply.send({ success: true, data: container });
    }
  );

  // ── PATCH /api/v1/containers/:id ──────────────────────────────────────────
  app.patch(
    "/containers/:id",
    { preHandler: [app.authenticate, app.requireRole("USER", "ADMIN")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = UpdateContainerBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const container = await prisma.container.findUnique({ where: { id } });
      if (!container) {
        return reply.status(404).send({ success: false, error: "Container not found" });
      }

      const { label, notes, locationId, externalLocationId } = body.data;

      // Validate referenced location exists when setting a new one
      if (locationId) {
        const location = await prisma.storageLocation.findUnique({ where: { id: locationId } });
        if (!location) {
          return reply.status(404).send({ success: false, error: "Storage location not found" });
        }
      }

      if (externalLocationId) {
        const extLocation = await prisma.externalLocation.findUnique({ where: { id: externalLocationId } });
        if (!extLocation) {
          return reply.status(404).send({ success: false, error: "External location not found" });
        }
      }

      const updated = await prisma.container.update({
        where: { id },
        data: {
          ...(label !== undefined ? { label } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(locationId !== undefined ? { locationId } : {}),
          ...(externalLocationId !== undefined ? { externalLocationId } : {}),
          // Mutually exclusive: setting one clears the other
          ...(locationId ? { externalLocationId: null } : {}),
          ...(externalLocationId ? { locationId: null } : {}),
        },
        include: {
          location: {
            include: { storageArea: { include: { building: { include: { site: true } } } } },
          },
          externalLocation: true,
          _count: { select: { items: true } },
        },
      });

      return reply.send({ success: true, data: updated });
    }
  );
}
