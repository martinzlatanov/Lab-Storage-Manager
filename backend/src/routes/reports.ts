import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// ─── Query schemas ────────────────────────────────────────────────────────────

const ByLocationQuery = z.object({
  siteId: z.string().optional(),
  buildingId: z.string().optional(),
  areaId: z.string().optional(),
});

const ExternalQuery = z.object({
  externalLocationId: z.string().optional(),
  overdueOnly: z.enum(["true", "false"]).optional(),
});

const ExpiryQuery = z.object({
  siteId: z.string().optional(),
  withinDays: z.coerce.number().int().min(1).optional(),
  includeExpired: z.enum(["true", "false"]).optional(),
});

const AuditQuery = z.object({
  itemId: z.string().optional(),
  operationType: z.enum(["RECEIPT", "MOVE", "TEMP_EXIT", "RETURN", "SCRAP", "CONSUME"]).optional(),
  performedById: z.string().optional(),
  siteId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function reportsRoutes(app: FastifyInstance) {

  // ── GET /api/v1/reports/by-location ───────────────────────────────────────
  // Returns items grouped by storage location.
  // Scope can be narrowed to site → building → area.
  app.get(
    "/reports/by-location",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = ByLocationQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ success: false, error: "Invalid query parameters" });
      }

      const { siteId, buildingId, areaId } = query.data;

      // Build the nested area filter
      const areaWhere = areaId
        ? { id: areaId }
        : buildingId
          ? { buildingId }
          : siteId
            ? { building: { siteId } }
            : undefined;

      const locations = await prisma.storageLocation.findMany({
        where: areaWhere ? { storageArea: areaWhere } : undefined,
        orderBy: { label: "asc" },
        include: {
          storageArea: {
            include: { building: { include: { site: true } } },
          },
          containers: {
            include: {
              items: {
                where: { status: { not: "SCRAPPED" } },
                select: {
                  id: true, barcode: true, itemType: true, status: true,
                  labIdNumber: true, productName: true, miscName: true,
                  manufacturer: true, quantity: true, unit: true,
                },
              },
            },
          },
          items: {
            where: { status: { not: "SCRAPPED" }, containerId: null },
            select: {
              id: true, barcode: true, itemType: true, status: true,
              labIdNumber: true, productName: true, miscName: true,
              manufacturer: true, quantity: true, unit: true,
            },
          },
        },
      });

      // Enrich each location with total item count
      const data = locations.map((loc) => {
        const directCount = loc.items.length;
        const containerCount = loc.containers.reduce((sum, c) => sum + c.items.length, 0);
        return { ...loc, totalItems: directCount + containerCount };
      });

      return reply.send({ success: true, data });
    }
  );

  // ── GET /api/v1/reports/external ──────────────────────────────────────────
  // Returns all items currently at external locations with overdue flag.
  app.get(
    "/reports/external",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = ExternalQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ success: false, error: "Invalid query parameters" });
      }

      const { externalLocationId, overdueOnly } = query.data;
      const now = new Date();

      // Find the most recent TEMP_EXIT record for each item currently away
      const exitRecords = await prisma.operationRecord.findMany({
        where: {
          operationType: "TEMP_EXIT",
          ...(externalLocationId ? { toExternalLocationId: externalLocationId } : {}),
          item: { status: "TEMP_EXIT" },
        },
        orderBy: { performedAt: "desc" },
        distinct: ["itemId"],
        include: {
          item: {
            select: {
              id: true, barcode: true, itemType: true, labIdNumber: true,
              productName: true, miscName: true, manufacturer: true,
              externalLocationId: true,
              externalLocation: { select: { id: true, name: true, city: true, contactPerson: true } },
            },
          },
          performedBy: { select: { id: true, displayName: true } },
          toExternalLocation: { select: { id: true, name: true, city: true } },
        },
      });

      // Attach overdue flag
      const data = exitRecords
        .map((rec) => ({
          ...rec,
          isOverdue: rec.expectedReturnDate ? rec.expectedReturnDate < now : false,
        }))
        .filter((rec) => (overdueOnly === "true" ? rec.isOverdue : true));

      return reply.send({ success: true, data });
    }
  );

  // ── GET /api/v1/reports/expiry ────────────────────────────────────────────
  // Returns consumables sorted by expiry date, with optional lookahead window.
  app.get(
    "/reports/expiry",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = ExpiryQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ success: false, error: "Invalid query parameters" });
      }

      const { siteId, withinDays, includeExpired } = query.data;
      const now = new Date();

      // Build date ceiling if withinDays is set
      const dateCeiling = withinDays
        ? new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)
        : undefined;

      // Build location filter scoped to site
      let locationFilter: object = {};
      if (siteId) {
        const locationIds = await prisma.storageLocation.findMany({
          where: { storageArea: { building: { siteId } } },
          select: { id: true },
        });
        const ids = locationIds.map((l) => l.id);
        locationFilter = {
          OR: [
            { locationId: { in: ids } },
            { container: { locationId: { in: ids } } },
          ],
        };
      }

      const items = await prisma.item.findMany({
        where: {
          itemType: "CONSUMABLE",
          status: { notIn: includeExpired === "true" ? ["SCRAPPED"] : ["SCRAPPED", "DEPLETED"] },
          expiryDate: {
            not: null,
            ...(includeExpired !== "true" ? { gte: undefined } : {}),
            ...(dateCeiling ? { lte: dateCeiling } : {}),
          },
          ...locationFilter,
        },
        orderBy: { expiryDate: "asc" },
        select: {
          id: true, barcode: true, status: true, labIdNumber: true,
          manufacturer: true, model: true, consumableType: true,
          quantity: true, unit: true, lotNumber: true,
          expiryDate: true, shelfLifeMonths: true,
          location: { select: { id: true, label: true } },
          container: { select: { id: true, label: true } },
          externalLocation: { select: { id: true, name: true } },
        },
      });

      // Attach days-until-expiry
      const data = items.map((item) => ({
        ...item,
        daysUntilExpiry: item.expiryDate
          ? Math.ceil((item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }));

      return reply.send({ success: true, data });
    }
  );

  // ── GET /api/v1/reports/audit ─────────────────────────────────────────────
  // Full paginated audit log with rich filters.
  app.get(
    "/reports/audit",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = AuditQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ success: false, error: "Invalid query parameters" });
      }

      const { itemId, operationType, performedById, siteId, from, to, page, pageSize } = query.data;
      const skip = (page - 1) * pageSize;

      // Resolve siteId to a set of location IDs for filtering operations that
      // touched locations within that site
      let siteLocationIds: string[] | undefined;
      if (siteId) {
        const locs = await prisma.storageLocation.findMany({
          where: { storageArea: { building: { siteId } } },
          select: { id: true },
        });
        siteLocationIds = locs.map((l) => l.id);
      }

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
        ...(siteLocationIds
          ? {
              OR: [
                { fromLocationId: { in: siteLocationIds } },
                { toLocationId: { in: siteLocationIds } },
                { item: { locationId: { in: siteLocationIds } } },
              ],
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
            item: {
              select: {
                id: true, barcode: true, itemType: true,
                labIdNumber: true, productName: true, miscName: true,
              },
            },
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
}
