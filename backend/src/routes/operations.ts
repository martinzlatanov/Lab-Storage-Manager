import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const ReceiptBody = z.object({
  itemId: z.string().min(1),
  locationId: z.string().optional(),
  containerId: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (d) => !!(d.locationId || d.containerId),
  { message: "Receipt requires either a locationId or containerId" }
).refine(
  (d) => !(d.locationId && d.containerId),
  { message: "Provide either locationId or containerId, not both" }
);

const MoveBody = z.object({
  itemId: z.string().min(1),
  toLocationId: z.string().optional(),
  toContainerId: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (d) => !!(d.toLocationId || d.toContainerId),
  { message: "Move requires either a toLocationId or toContainerId" }
).refine(
  (d) => !(d.toLocationId && d.toContainerId),
  { message: "Provide either toLocationId or toContainerId, not both" }
);

const ExitBody = z.object({
  itemId: z.string().min(1),
  toExternalLocationId: z.string().min(1),
  expectedReturnDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const ReturnBody = z.object({
  itemId: z.string().min(1),
  toLocationId: z.string().optional(),
  toContainerId: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (d) => !!(d.toLocationId || d.toContainerId),
  { message: "Return requires either a toLocationId or toContainerId" }
).refine(
  (d) => !(d.toLocationId && d.toContainerId),
  { message: "Provide either toLocationId or toContainerId, not both" }
);

const ScrapBody = z.object({
  itemId: z.string().min(1),
  notes: z.string().optional(),
});

const ConsumeBody = z.object({
  itemId: z.string().min(1),
  quantityConsumed: z.number().positive(),
  notes: z.string().optional(),
});

const ListOperationsQuery = z.object({
  itemId: z.string().optional(),
  operationType: z.enum(["RECEIPT", "MOVE", "TEMP_EXIT", "RETURN", "SCRAP", "CONSUME"]).optional(),
  performedById: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function operationsRoutes(app: FastifyInstance) {

  // ── GET /api/v1/operations ─────────────────────────────────────────────────
  app.get(
    "/operations",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = ListOperationsQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ success: false, error: "Invalid query parameters" });
      }

      const { itemId, operationType, performedById, from, to, page, pageSize } = query.data;
      const skip = (page - 1) * pageSize;

      const where = {
        ...(itemId ? { itemId } : {}),
        ...(operationType ? { operationType } : {}),
        ...(performedById ? { performedById } : {}),
        ...(from || to
          ? {
              performedAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      };

      const [operations, total] = await Promise.all([
        prisma.operationRecord.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { performedAt: "desc" },
          include: {
            item: { select: { id: true, barcode: true, itemType: true, labIdNumber: true, productName: true, miscName: true } },
            performedBy: { select: { id: true, displayName: true } },
            fromLocation: { select: { id: true, label: true } },
            toLocation: { select: { id: true, label: true } },
            fromContainer: { select: { id: true, label: true } },
            toContainer: { select: { id: true, label: true } },
            fromExternalLocation: { select: { id: true, name: true } },
            toExternalLocation: { select: { id: true, name: true } },
          },
        }),
        prisma.operationRecord.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: operations,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      });
    }
  );

  // ── POST /api/v1/operations/receipt ───────────────────────────────────────
  app.post(
    "/operations/receipt",
    { preHandler: [app.authenticate, app.requireRole("USER")] },
    async (req, reply) => {
      const body = ReceiptBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const { itemId, locationId, containerId, notes } = body.data;

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return reply.status(404).send({ success: false, error: "Item not found" });
      if (item.status === "SCRAPPED") {
        return reply.status(409).send({ success: false, error: "Cannot operate on a scrapped item" });
      }

      if (locationId) {
        const loc = await prisma.storageLocation.findUnique({ where: { id: locationId } });
        if (!loc) return reply.status(404).send({ success: false, error: "Storage location not found" });
      }
      if (containerId) {
        const c = await prisma.container.findUnique({ where: { id: containerId } });
        if (!c) return reply.status(404).send({ success: false, error: "Container not found" });
      }

      const [operation] = await prisma.$transaction([
        prisma.operationRecord.create({
          data: {
            operationType: "RECEIPT",
            itemId,
            performedById: req.user.id,
            notes,
            toLocationId: locationId,
            toContainerId: containerId,
          },
        }),
        prisma.item.update({
          where: { id: itemId },
          data: {
            status: "IN_STORAGE",
            locationId: locationId ?? null,
            containerId: containerId ?? null,
            externalLocationId: null,
          },
        }),
      ]);

      return reply.status(201).send({ success: true, data: operation });
    }
  );

  // ── POST /api/v1/operations/move ──────────────────────────────────────────
  app.post(
    "/operations/move",
    { preHandler: [app.authenticate, app.requireRole("USER")] },
    async (req, reply) => {
      const body = MoveBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const { itemId, toLocationId, toContainerId, notes } = body.data;

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return reply.status(404).send({ success: false, error: "Item not found" });
      if (item.status === "SCRAPPED") {
        return reply.status(409).send({ success: false, error: "Cannot move a scrapped item" });
      }
      if (item.status === "TEMP_EXIT") {
        return reply.status(409).send({ success: false, error: "Item is currently at an external location — record a return first" });
      }

      if (toLocationId) {
        const loc = await prisma.storageLocation.findUnique({ where: { id: toLocationId } });
        if (!loc) return reply.status(404).send({ success: false, error: "Destination location not found" });
      }
      if (toContainerId) {
        const c = await prisma.container.findUnique({ where: { id: toContainerId } });
        if (!c) return reply.status(404).send({ success: false, error: "Destination container not found" });
      }

      const [operation] = await prisma.$transaction([
        prisma.operationRecord.create({
          data: {
            operationType: "MOVE",
            itemId,
            performedById: req.user.id,
            notes,
            fromLocationId: item.locationId,
            fromContainerId: item.containerId,
            toLocationId: toLocationId ?? null,
            toContainerId: toContainerId ?? null,
          },
        }),
        prisma.item.update({
          where: { id: itemId },
          data: {
            locationId: toLocationId ?? null,
            containerId: toContainerId ?? null,
          },
        }),
      ]);

      return reply.status(201).send({ success: true, data: operation });
    }
  );

  // ── POST /api/v1/operations/exit ──────────────────────────────────────────
  app.post(
    "/operations/exit",
    { preHandler: [app.authenticate, app.requireRole("USER")] },
    async (req, reply) => {
      const body = ExitBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const { itemId, toExternalLocationId, expectedReturnDate, notes } = body.data;

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return reply.status(404).send({ success: false, error: "Item not found" });
      if (item.status === "SCRAPPED") {
        return reply.status(409).send({ success: false, error: "Cannot exit a scrapped item" });
      }
      if (item.status === "TEMP_EXIT") {
        return reply.status(409).send({ success: false, error: "Item is already at an external location" });
      }

      const extLoc = await prisma.externalLocation.findUnique({ where: { id: toExternalLocationId } });
      if (!extLoc) return reply.status(404).send({ success: false, error: "External location not found" });

      const [operation] = await prisma.$transaction([
        prisma.operationRecord.create({
          data: {
            operationType: "TEMP_EXIT",
            itemId,
            performedById: req.user.id,
            notes,
            fromLocationId: item.locationId,
            fromContainerId: item.containerId,
            toExternalLocationId,
            expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          },
        }),
        prisma.item.update({
          where: { id: itemId },
          data: {
            status: "TEMP_EXIT",
            locationId: null,
            containerId: null,
            externalLocationId: toExternalLocationId,
          },
        }),
      ]);

      return reply.status(201).send({ success: true, data: operation });
    }
  );

  // ── POST /api/v1/operations/return ────────────────────────────────────────
  app.post(
    "/operations/return",
    { preHandler: [app.authenticate, app.requireRole("USER")] },
    async (req, reply) => {
      const body = ReturnBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const { itemId, toLocationId, toContainerId, notes } = body.data;

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return reply.status(404).send({ success: false, error: "Item not found" });
      if (item.status !== "TEMP_EXIT") {
        return reply.status(409).send({ success: false, error: "Item is not currently at an external location" });
      }

      if (toLocationId) {
        const loc = await prisma.storageLocation.findUnique({ where: { id: toLocationId } });
        if (!loc) return reply.status(404).send({ success: false, error: "Storage location not found" });
      }
      if (toContainerId) {
        const c = await prisma.container.findUnique({ where: { id: toContainerId } });
        if (!c) return reply.status(404).send({ success: false, error: "Container not found" });
      }

      const [operation] = await prisma.$transaction([
        prisma.operationRecord.create({
          data: {
            operationType: "RETURN",
            itemId,
            performedById: req.user.id,
            notes,
            fromExternalLocationId: item.externalLocationId,
            toLocationId: toLocationId ?? null,
            toContainerId: toContainerId ?? null,
          },
        }),
        prisma.item.update({
          where: { id: itemId },
          data: {
            status: "IN_STORAGE",
            externalLocationId: null,
            locationId: toLocationId ?? null,
            containerId: toContainerId ?? null,
          },
        }),
      ]);

      return reply.status(201).send({ success: true, data: operation });
    }
  );

  // ── POST /api/v1/operations/scrap ─────────────────────────────────────────
  app.post(
    "/operations/scrap",
    { preHandler: [app.authenticate, app.requireRole("USER")] },
    async (req, reply) => {
      const body = ScrapBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const { itemId, notes } = body.data;

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return reply.status(404).send({ success: false, error: "Item not found" });
      if (item.status === "SCRAPPED") {
        return reply.status(409).send({ success: false, error: "Item is already scrapped" });
      }

      const [operation] = await prisma.$transaction([
        prisma.operationRecord.create({
          data: {
            operationType: "SCRAP",
            itemId,
            performedById: req.user.id,
            notes,
            fromLocationId: item.locationId,
            fromContainerId: item.containerId,
            fromExternalLocationId: item.externalLocationId,
          },
        }),
        prisma.item.update({
          where: { id: itemId },
          data: { status: "SCRAPPED" },
        }),
      ]);

      return reply.status(201).send({ success: true, data: operation });
    }
  );

  // ── POST /api/v1/operations/consume ───────────────────────────────────────
  app.post(
    "/operations/consume",
    { preHandler: [app.authenticate, app.requireRole("USER")] },
    async (req, reply) => {
      const body = ConsumeBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const { itemId, quantityConsumed, notes } = body.data;

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) return reply.status(404).send({ success: false, error: "Item not found" });
      if (item.itemType !== "CONSUMABLE") {
        return reply.status(409).send({ success: false, error: "Consume operation is only valid for consumable items" });
      }
      if (item.status === "SCRAPPED" || item.status === "DEPLETED") {
        return reply.status(409).send({ success: false, error: "Item is no longer available" });
      }

      const currentQty = item.quantity ?? 0;
      if (quantityConsumed > currentQty) {
        return reply.status(409).send({
          success: false,
          error: `Cannot consume ${quantityConsumed} ${item.unit ?? "units"} — only ${currentQty} available`,
        });
      }

      const newQty = currentQty - quantityConsumed;
      const newStatus = newQty <= 0 ? "DEPLETED" : item.status;

      const [operation] = await prisma.$transaction([
        prisma.operationRecord.create({
          data: {
            operationType: "CONSUME",
            itemId,
            performedById: req.user.id,
            notes,
            quantityConsumed,
          },
        }),
        prisma.item.update({
          where: { id: itemId },
          data: {
            quantity: newQty,
            status: newStatus,
          },
        }),
      ]);

      return reply.status(201).send({ success: true, data: operation });
    }
  );
}
