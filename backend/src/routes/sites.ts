import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreateSiteBody = z.object({
  name: z.string().min(1).max(100),
});

const CreateBuildingBody = z.object({
  name: z.string().min(1).max(100),
});

const CreateAreaBody = z.object({
  code: z.string().min(1).max(10).toUpperCase(),
});

const CreateLocationBody = z.object({
  row: z.string().min(1).max(10),
  shelf: z.string().min(1).max(10),
  level: z.string().min(1).max(10),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function sitesRoutes(app: FastifyInstance) {
  // ── Sites ─────────────────────────────────────────────────────────────────

  // GET /api/v1/sites
  app.get(
    "/sites",
    { preHandler: [app.authenticate] },
    async (_req, reply) => {
      const sites = await prisma.site.findMany({
        orderBy: { name: "asc" },
        include: { buildings: { orderBy: { name: "asc" } } },
      });
      return reply.send({ success: true, data: sites });
    }
  );

  // POST /api/v1/sites
  app.post(
    "/sites",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const body = CreateSiteBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const existing = await prisma.site.findUnique({ where: { name: body.data.name } });
      if (existing) {
        return reply.status(409).send({ success: false, error: "A site with this name already exists" });
      }

      const site = await prisma.site.create({ data: { name: body.data.name } });
      return reply.status(201).send({ success: true, data: site });
    }
  );

  // ── Buildings ─────────────────────────────────────────────────────────────

  // GET /api/v1/sites/:siteId/buildings
  app.get(
    "/sites/:siteId/buildings",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { siteId } = req.params as { siteId: string };

      const buildings = await prisma.building.findMany({
        where: { siteId },
        orderBy: { name: "asc" },
        include: { storageAreas: { orderBy: { code: "asc" } } },
      });
      return reply.send({ success: true, data: buildings });
    }
  );

  // POST /api/v1/sites/:siteId/buildings
  app.post(
    "/sites/:siteId/buildings",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { siteId } = req.params as { siteId: string };
      const body = CreateBuildingBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) {
        return reply.status(404).send({ success: false, error: "Site not found" });
      }

      const existing = await prisma.building.findUnique({
        where: { siteId_name: { siteId, name: body.data.name } },
      });
      if (existing) {
        return reply.status(409).send({ success: false, error: "A building with this name already exists in this site" });
      }

      const building = await prisma.building.create({
        data: { name: body.data.name, siteId },
      });
      return reply.status(201).send({ success: true, data: building });
    }
  );

  // ── Storage Areas ─────────────────────────────────────────────────────────

  // GET /api/v1/buildings/:buildingId/areas
  app.get(
    "/buildings/:buildingId/areas",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { buildingId } = req.params as { buildingId: string };

      const areas = await prisma.storageArea.findMany({
        where: { buildingId },
        orderBy: { code: "asc" },
        include: {
          locations: {
            orderBy: [{ row: "asc" }, { shelf: "asc" }, { level: "asc" }],
          },
        },
      });
      return reply.send({ success: true, data: areas });
    }
  );

  // POST /api/v1/buildings/:buildingId/areas
  app.post(
    "/buildings/:buildingId/areas",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { buildingId } = req.params as { buildingId: string };
      const body = CreateAreaBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const building = await prisma.building.findUnique({ where: { id: buildingId } });
      if (!building) {
        return reply.status(404).send({ success: false, error: "Building not found" });
      }

      const existing = await prisma.storageArea.findUnique({
        where: { buildingId_code: { buildingId, code: body.data.code } },
      });
      if (existing) {
        return reply.status(409).send({ success: false, error: "An area with this code already exists in this building" });
      }

      const area = await prisma.storageArea.create({
        data: { code: body.data.code, buildingId },
      });
      return reply.status(201).send({ success: true, data: area });
    }
  );

  // ── Storage Locations ─────────────────────────────────────────────────────

  // GET /api/v1/areas/:areaId/locations
  app.get(
    "/areas/:areaId/locations",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { areaId } = req.params as { areaId: string };

      const locations = await prisma.storageLocation.findMany({
        where: { storageAreaId: areaId },
        orderBy: [{ row: "asc" }, { shelf: "asc" }, { level: "asc" }],
      });
      return reply.send({ success: true, data: locations });
    }
  );

  // POST /api/v1/areas/:areaId/locations
  app.post(
    "/areas/:areaId/locations",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { areaId } = req.params as { areaId: string };
      const body = CreateLocationBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const area = await prisma.storageArea.findUnique({
        where: { id: areaId },
        include: { building: false },
      });
      if (!area) {
        return reply.status(404).send({ success: false, error: "Storage area not found" });
      }

      const existing = await prisma.storageLocation.findUnique({
        where: {
          storageAreaId_row_shelf_level: {
            storageAreaId: areaId,
            row: body.data.row,
            shelf: body.data.shelf,
            level: body.data.level,
          },
        },
      });
      if (existing) {
        return reply.status(409).send({ success: false, error: "This location already exists" });
      }

      const label = `${area.code}-${body.data.row}-${body.data.shelf}-${body.data.level}`;
      const location = await prisma.storageLocation.create({
        data: {
          storageAreaId: areaId,
          row: body.data.row,
          shelf: body.data.shelf,
          level: body.data.level,
          label,
        },
      });
      return reply.status(201).send({ success: true, data: location });
    }
  );

  // GET /api/v1/locations (flat list — for dropdowns)
  app.get(
    "/locations",
    { preHandler: [app.authenticate] },
    async (_req, reply) => {
      const locations = await prisma.storageLocation.findMany({
        orderBy: { label: "asc" },
        include: {
          storageArea: { include: { building: { include: { site: true } } } },
        },
      });
      const data = locations.map((loc) => ({
        id: loc.id,
        label: loc.label,
        buildingName: loc.storageArea.building.name,
        siteName: loc.storageArea.building.site.name,
      }));
      return reply.send({ success: true, data });
    }
  );

  // GET /api/v1/locations/:locationId
  app.get(
    "/locations/:locationId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { locationId } = req.params as { locationId: string };

      const location = await prisma.storageLocation.findUnique({
        where: { id: locationId },
        include: {
          storageArea: { include: { building: { include: { site: true } } } },
          items: {
            where: { status: { not: "SCRAPPED" } },
            orderBy: { createdAt: "desc" },
          },
          containers: true,
        },
      });

      if (!location) {
        return reply.status(404).send({ success: false, error: "Location not found" });
      }

      return reply.send({ success: true, data: location });
    }
  );
}
