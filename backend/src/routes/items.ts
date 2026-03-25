import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// ─── Shared location schema (reused across all item types) ────────────────────

const LocationFields = z.object({
  locationId: z.string().optional(),
  containerId: z.string().optional(),
  externalLocationId: z.string().optional(),
}).refine(
  (d) => !d.externalLocationId || (!d.locationId && !d.containerId),
  { message: "externalLocationId cannot be combined with locationId or containerId" }
);

// ─── Create schemas per item type ─────────────────────────────────────────────

const CreateElectronicsBody = LocationFields.and(z.object({
  barcode: z.string().min(1).max(100),
  labIdNumber: z.string().min(1).max(100),
  comment: z.string().optional(),
  oem: z.string().min(1).max(100),
  productName: z.string().min(1).max(200),
  productType: z.string().min(1).max(100),
  oemPartNumber: z.string().min(1).max(100),
  serialNumber: z.string().optional(),
  developmentPhase: z.enum(["PRE_DV", "DV", "PV"]).optional(),
  plantLocation: z.string().optional(),
  testRequestNumber: z.string().min(1).max(100),
  requester: z.string().optional(),
}));

const CreateFixtureBody = LocationFields.and(z.object({
  barcode: z.string().min(1).max(100),
  labIdNumber: z.string().min(1).max(100),
  comment: z.string().optional(),
  productName: z.string().min(1).max(200),
  fixtureCategories: z.array(z.enum(["VIBRATION", "MECHANICAL_SHOCK", "CLIMATIC", "DUST", "SALT", "WATER", "OTHER"])).min(1),
  pictureUrl: z.string().url().optional(),
}));

const CreateSparePartBody = LocationFields.and(z.object({
  barcode: z.string().min(1).max(100),
  labIdNumber: z.string().min(1).max(100),
  comment: z.string().optional(),
  manufacturer: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  partType: z.string().min(1).max(100),
  variant: z.string().optional(),
  forMachines: z.array(z.string()).optional(),
}));

const CreateConsumableBody = LocationFields.and(z.object({
  barcode: z.string().min(1).max(100),
  labIdNumber: z.string().min(1).max(100),
  comment: z.string().optional(),
  manufacturer: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  consumableType: z.string().min(1).max(100),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  lotNumber: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  shelfLifeMonths: z.number().int().positive().optional(),
}));

const CreateMiscBody = LocationFields.and(z.object({
  barcode: z.string().min(1).max(100),
  labIdNumber: z.string().min(1).max(100),
  comment: z.string().optional(),
  miscName: z.string().min(1).max(200),
  miscDescription: z.string().optional(),
}));

// ─── Update schema (common attributes only — type-specific fields unchanged) ──

const UpdateItemBody = z.object({
  comment: z.string().nullable().optional(),
  labIdNumber: z.string().min(1).max(100).optional(),
  // Electronics
  oem: z.string().optional(),
  productName: z.string().optional(),
  productType: z.string().optional(),
  oemPartNumber: z.string().optional(),
  serialNumber: z.string().nullable().optional(),
  developmentPhase: z.enum(["PRE_DV", "DV", "PV"]).nullable().optional(),
  plantLocation: z.string().nullable().optional(),
  testRequestNumber: z.string().optional(),
  requester: z.string().nullable().optional(),
  // Fixture
  fixtureCategories: z.array(z.enum(["VIBRATION", "MECHANICAL_SHOCK", "CLIMATIC", "DUST", "SALT", "WATER", "OTHER"])).optional(),
  pictureUrl: z.string().url().nullable().optional(),
  // Spare Part
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  partType: z.string().optional(),
  variant: z.string().nullable().optional(),
  forMachines: z.array(z.string()).optional(),
  // Consumable
  consumableType: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  lotNumber: z.string().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
  shelfLifeMonths: z.number().int().positive().nullable().optional(),
  // Misc
  miscName: z.string().optional(),
  miscDescription: z.string().nullable().optional(),
});

// ─── List query ───────────────────────────────────────────────────────────────

const ListItemsQuery = z.object({
  itemType: z.enum(["ELECTRONICS_SAMPLE", "FIXTURE", "SPARE_PART", "CONSUMABLE", "MISC"]).optional(),
  status: z.enum(["IN_STORAGE", "TEMP_EXIT", "SCRAPPED", "DEPLETED"]).optional(),
  siteId: z.string().optional(),
  locationId: z.string().optional(),
  containerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(25),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve siteId filter to a set of locationIds within that site. */
async function getLocationIdsForSite(siteId: string): Promise<string[]> {
  const locations = await prisma.storageLocation.findMany({
    where: {
      storageArea: { building: { siteId } },
    },
    select: { id: true },
  });
  return locations.map((l) => l.id);
}

/** Validate that at most one location ref is set and all referenced entities exist. */
async function validateLocation(
  locationId?: string,
  containerId?: string,
  externalLocationId?: string
): Promise<string | null> {
  if (locationId) {
    const loc = await prisma.storageLocation.findUnique({ where: { id: locationId } });
    if (!loc) return "Storage location not found";
  }
  if (containerId) {
    const c = await prisma.container.findUnique({ where: { id: containerId } });
    if (!c) return "Container not found";
  }
  if (externalLocationId) {
    const ext = await prisma.externalLocation.findUnique({ where: { id: externalLocationId } });
    if (!ext) return "External location not found";
  }
  return null;
}

// ─── Item select for list responses (lighter payload) ────────────────────────

const itemListSelect = {
  id: true,
  barcode: true,
  itemType: true,
  status: true,
  labIdNumber: true,
  comment: true,
  containerId: true,
  locationId: true,
  externalLocationId: true,
  createdAt: true,
  updatedAt: true,
  // Type-discriminating display fields
  oem: true,
  productName: true,
  productType: true,
  oemPartNumber: true,
  manufacturer: true,
  model: true,
  partType: true,
  consumableType: true,
  quantity: true,
  unit: true,
  expiryDate: true,
  miscName: true,
  fixtureCategories: true,
  location: {
    select: {
      id: true,
      label: true,
      storageArea: { select: { code: true, building: { select: { name: true, site: { select: { name: true } } } } } },
    },
  },
  container: { select: { id: true, label: true, barcode: true } },
  externalLocation: { select: { id: true, name: true, city: true } },
  createdBy: { select: { id: true, displayName: true } },
} as const;

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function itemsRoutes(app: FastifyInstance) {

  // ── GET /api/v1/items ──────────────────────────────────────────────────────
  app.get(
    "/items",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = ListItemsQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ success: false, error: "Invalid query parameters" });
      }

      const { itemType, status, siteId, locationId, containerId, search, page, pageSize } = query.data;
      const skip = (page - 1) * pageSize;

      // Build location filter — siteId expands to all locationIds within that site
      let locationFilter: object = {};
      if (siteId) {
        const ids = await getLocationIdsForSite(siteId);
        locationFilter = { locationId: { in: ids } };
      } else if (locationId) {
        locationFilter = { locationId };
      } else if (containerId) {
        locationFilter = { containerId };
      }

      const where = {
        ...(itemType ? { itemType } : {}),
        ...(status ? { status } : {}),
        ...locationFilter,
        ...(search
          ? {
              OR: [
                { barcode: { contains: search, mode: "insensitive" as const } },
                { labIdNumber: { contains: search, mode: "insensitive" as const } },
                { productName: { contains: search, mode: "insensitive" as const } },
                { oemPartNumber: { contains: search, mode: "insensitive" as const } },
                { testRequestNumber: { contains: search, mode: "insensitive" as const } },
                { miscName: { contains: search, mode: "insensitive" as const } },
                { manufacturer: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        prisma.item.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          select: itemListSelect,
        }),
        prisma.item.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: items,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      });
    }
  );

  // ── GET /api/v1/items/scan/:barcode ───────────────────────────────────────
  // Must be before /:id
  app.get(
    "/items/scan/:barcode",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { barcode } = req.params as { barcode: string };

      const item = await prisma.item.findUnique({
        where: { barcode },
        include: {
          location: { include: { storageArea: { include: { building: { include: { site: true } } } } } },
          container: true,
          externalLocation: true,
          createdBy: { select: { id: true, displayName: true } },
        },
      });

      if (!item) {
        return reply.status(404).send({ success: false, error: "Item not found" });
      }

      return reply.send({ success: true, data: item });
    }
  );

  // ── GET /api/v1/items/:id ──────────────────────────────────────────────────
  app.get(
    "/items/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const item = await prisma.item.findUnique({
        where: { id },
        include: {
          location: { include: { storageArea: { include: { building: { include: { site: true } } } } } },
          container: { include: { location: true } },
          externalLocation: true,
          createdBy: { select: { id: true, displayName: true } },
        },
      });

      if (!item) {
        return reply.status(404).send({ success: false, error: "Item not found" });
      }

      return reply.send({ success: true, data: item });
    }
  );

  // ── GET /api/v1/items/:id/history ─────────────────────────────────────────
  app.get(
    "/items/:id/history",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const item = await prisma.item.findUnique({ where: { id }, select: { id: true } });
      if (!item) {
        return reply.status(404).send({ success: false, error: "Item not found" });
      }

      const operations = await prisma.operationRecord.findMany({
        where: { itemId: id },
        orderBy: { performedAt: "desc" },
        include: {
          performedBy: { select: { id: true, displayName: true } },
          fromLocation: { select: { id: true, label: true } },
          toLocation: { select: { id: true, label: true } },
          fromContainer: { select: { id: true, label: true } },
          toContainer: { select: { id: true, label: true } },
          fromExternalLocation: { select: { id: true, name: true } },
          toExternalLocation: { select: { id: true, name: true } },
        },
      });

      return reply.send({ success: true, data: operations });
    }
  );

  // ── POST /api/v1/items/electronics ────────────────────────────────────────
  app.post(
    "/items/electronics",
    { preHandler: [app.authenticate, app.requireRole("USER", "ADMIN")] },
    async (req, reply) => {
      const body = CreateElectronicsBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const existing = await prisma.item.findUnique({ where: { barcode: body.data.barcode } });
      if (existing) {
        return reply.status(409).send({ success: false, error: "An item with this barcode already exists" });
      }

      const locationError = await validateLocation(body.data.locationId, body.data.containerId, body.data.externalLocationId);
      if (locationError) return reply.status(404).send({ success: false, error: locationError });

      const { locationId, containerId, externalLocationId } = body.data;
      const hasLocation = locationId || containerId || externalLocationId;

      const [item] = await prisma.$transaction(async (tx) => {
        const created = await tx.item.create({
          data: {
            itemType: "ELECTRONICS_SAMPLE",
            barcode: body.data.barcode,
            labIdNumber: body.data.labIdNumber,
            comment: body.data.comment,
            locationId,
            containerId,
            externalLocationId,
            createdById: req.user.id,
            oem: body.data.oem,
            productName: body.data.productName,
            productType: body.data.productType,
            oemPartNumber: body.data.oemPartNumber,
            serialNumber: body.data.serialNumber,
            developmentPhase: body.data.developmentPhase,
            plantLocation: body.data.plantLocation,
            testRequestNumber: body.data.testRequestNumber,
            requester: body.data.requester,
          },
        });
        if (hasLocation) {
          await tx.operationRecord.create({
            data: {
              operationType: "RECEIPT",
              itemId: created.id,
              performedById: req.user.id,
              toLocationId: locationId,
              toContainerId: containerId,
              toExternalLocationId: externalLocationId,
            },
          });
        }
        return [created];
      });

      return reply.status(201).send({ success: true, data: item });
    }
  );

  // ── POST /api/v1/items/fixture ────────────────────────────────────────────
  app.post(
    "/items/fixture",
    { preHandler: [app.authenticate, app.requireRole("USER", "ADMIN")] },
    async (req, reply) => {
      const body = CreateFixtureBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const existing = await prisma.item.findUnique({ where: { barcode: body.data.barcode } });
      if (existing) {
        return reply.status(409).send({ success: false, error: "An item with this barcode already exists" });
      }

      const locationError = await validateLocation(body.data.locationId, body.data.containerId, body.data.externalLocationId);
      if (locationError) return reply.status(404).send({ success: false, error: locationError });

      const { locationId, containerId, externalLocationId } = body.data;
      const hasLocation = locationId || containerId || externalLocationId;

      const [item] = await prisma.$transaction(async (tx) => {
        const created = await tx.item.create({
          data: {
            itemType: "FIXTURE",
            barcode: body.data.barcode,
            labIdNumber: body.data.labIdNumber,
            comment: body.data.comment,
            locationId,
            containerId,
            externalLocationId,
            createdById: req.user.id,
            productName: body.data.productName,
            fixtureCategories: body.data.fixtureCategories,
            pictureUrl: body.data.pictureUrl,
          },
        });
        if (hasLocation) {
          await tx.operationRecord.create({
            data: {
              operationType: "RECEIPT",
              itemId: created.id,
              performedById: req.user.id,
              toLocationId: locationId,
              toContainerId: containerId,
              toExternalLocationId: externalLocationId,
            },
          });
        }
        return [created];
      });

      return reply.status(201).send({ success: true, data: item });
    }
  );

  // ── POST /api/v1/items/sparepart ──────────────────────────────────────────
  app.post(
    "/items/sparepart",
    { preHandler: [app.authenticate, app.requireRole("USER", "ADMIN")] },
    async (req, reply) => {
      const body = CreateSparePartBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const existing = await prisma.item.findUnique({ where: { barcode: body.data.barcode } });
      if (existing) {
        return reply.status(409).send({ success: false, error: "An item with this barcode already exists" });
      }

      const locationError = await validateLocation(body.data.locationId, body.data.containerId, body.data.externalLocationId);
      if (locationError) return reply.status(404).send({ success: false, error: locationError });

      const { locationId, containerId, externalLocationId } = body.data;
      const hasLocation = locationId || containerId || externalLocationId;

      const [item] = await prisma.$transaction(async (tx) => {
        const created = await tx.item.create({
          data: {
            itemType: "SPARE_PART",
            barcode: body.data.barcode,
            labIdNumber: body.data.labIdNumber,
            comment: body.data.comment,
            locationId,
            containerId,
            externalLocationId,
            createdById: req.user.id,
            manufacturer: body.data.manufacturer,
            model: body.data.model,
            partType: body.data.partType,
            variant: body.data.variant,
            forMachines: body.data.forMachines ?? [],
          },
        });
        if (hasLocation) {
          await tx.operationRecord.create({
            data: {
              operationType: "RECEIPT",
              itemId: created.id,
              performedById: req.user.id,
              toLocationId: locationId,
              toContainerId: containerId,
              toExternalLocationId: externalLocationId,
            },
          });
        }
        return [created];
      });

      return reply.status(201).send({ success: true, data: item });
    }
  );

  // ── POST /api/v1/items/consumable ─────────────────────────────────────────
  app.post(
    "/items/consumable",
    { preHandler: [app.authenticate, app.requireRole("USER", "ADMIN")] },
    async (req, reply) => {
      const body = CreateConsumableBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const existing = await prisma.item.findUnique({ where: { barcode: body.data.barcode } });
      if (existing) {
        return reply.status(409).send({ success: false, error: "An item with this barcode already exists" });
      }

      const locationError = await validateLocation(body.data.locationId, body.data.containerId, body.data.externalLocationId);
      if (locationError) return reply.status(404).send({ success: false, error: locationError });

      const { locationId, containerId, externalLocationId } = body.data;
      const hasLocation = locationId || containerId || externalLocationId;

      const [item] = await prisma.$transaction(async (tx) => {
        const created = await tx.item.create({
          data: {
            itemType: "CONSUMABLE",
            barcode: body.data.barcode,
            labIdNumber: body.data.labIdNumber,
            comment: body.data.comment,
            locationId,
            containerId,
            externalLocationId,
            createdById: req.user.id,
            manufacturer: body.data.manufacturer,
            model: body.data.model,
            consumableType: body.data.consumableType,
            quantity: body.data.quantity,
            unit: body.data.unit,
            lotNumber: body.data.lotNumber,
            expiryDate: body.data.expiryDate ? new Date(body.data.expiryDate) : undefined,
            shelfLifeMonths: body.data.shelfLifeMonths,
          },
        });
        if (hasLocation) {
          await tx.operationRecord.create({
            data: {
              operationType: "RECEIPT",
              itemId: created.id,
              performedById: req.user.id,
              toLocationId: locationId,
              toContainerId: containerId,
              toExternalLocationId: externalLocationId,
            },
          });
        }
        return [created];
      });

      return reply.status(201).send({ success: true, data: item });
    }
  );

  // ── POST /api/v1/items/misc ───────────────────────────────────────────────
  app.post(
    "/items/misc",
    { preHandler: [app.authenticate, app.requireRole("USER", "ADMIN")] },
    async (req, reply) => {
      const body = CreateMiscBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const existing = await prisma.item.findUnique({ where: { barcode: body.data.barcode } });
      if (existing) {
        return reply.status(409).send({ success: false, error: "An item with this barcode already exists" });
      }

      const locationError = await validateLocation(body.data.locationId, body.data.containerId, body.data.externalLocationId);
      if (locationError) return reply.status(404).send({ success: false, error: locationError });

      const { locationId, containerId, externalLocationId } = body.data;
      const hasLocation = locationId || containerId || externalLocationId;

      const [item] = await prisma.$transaction(async (tx) => {
        const created = await tx.item.create({
          data: {
            itemType: "MISC",
            barcode: body.data.barcode,
            labIdNumber: body.data.labIdNumber,
            comment: body.data.comment,
            locationId,
            containerId,
            externalLocationId,
            createdById: req.user.id,
            miscName: body.data.miscName,
            miscDescription: body.data.miscDescription,
          },
        });
        if (hasLocation) {
          await tx.operationRecord.create({
            data: {
              operationType: "RECEIPT",
              itemId: created.id,
              performedById: req.user.id,
              toLocationId: locationId,
              toContainerId: containerId,
              toExternalLocationId: externalLocationId,
            },
          });
        }
        return [created];
      });

      return reply.status(201).send({ success: true, data: item });
    }
  );

  // ── PATCH /api/v1/items/:id ───────────────────────────────────────────────
  app.patch(
    "/items/:id",
    { preHandler: [app.authenticate, app.requireRole("USER", "ADMIN")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = UpdateItemBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: body.error.issues[0]?.message ?? "Invalid request body" });
      }

      const item = await prisma.item.findUnique({ where: { id } });
      if (!item) {
        return reply.status(404).send({ success: false, error: "Item not found" });
      }

      // Scrapped items are immutable for non-admins
      if (item.status === "SCRAPPED" && req.user.role !== "ADMIN") {
        return reply.status(403).send({ success: false, error: "Scrapped items can only be edited by admins" });
      }

      const updated = await prisma.item.update({
        where: { id },
        data: body.data as Parameters<typeof prisma.item.update>[0]["data"],
      });

      return reply.send({ success: true, data: updated });
    }
  );
}
