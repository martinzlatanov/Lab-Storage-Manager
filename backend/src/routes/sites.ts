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

const RenameSiteBody = z.object({ name: z.string().min(1).max(100) });
const RenameBuildingBody = z.object({ name: z.string().min(1).max(100) });
const RenameAreaBody = z.object({ code: z.string().min(1).max(10).toUpperCase() });

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

  // DELETE /api/v1/sites/:siteId
  app.delete(
    "/sites/:siteId",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { siteId } = req.params as { siteId: string };

      const site = await prisma.site.findUnique({
        where: { id: siteId },
        include: {
          buildings: {
            include: {
              storageAreas: {
                include: { locations: { select: { id: true } } },
              },
            },
          },
        },
      });
      if (!site) {
        return reply.status(404).send({ success: false, error: "Site not found" });
      }

      const locationIds = site.buildings.flatMap((b) =>
        b.storageAreas.flatMap((a) => a.locations.map((l) => l.id))
      );

      if (locationIds.length > 0) {
        const activeItemCount = await prisma.item.count({
          where: { locationId: { in: locationIds }, status: "IN_STORAGE" },
        });
        if (activeItemCount > 0) {
          return reply.status(409).send({
            success: false,
            error: `Cannot delete: ${activeItemCount} item${activeItemCount !== 1 ? "s" : ""} stored in this site`,
          });
        }

        const containerCount = await prisma.container.count({
          where: { locationId: { in: locationIds } },
        });
        if (containerCount > 0) {
          return reply.status(409).send({
            success: false,
            error: `Cannot delete: ${containerCount} container${containerCount !== 1 ? "s" : ""} in this site`,
          });
        }

        await prisma.storageLocation.deleteMany({ where: { id: { in: locationIds } } });
      }

      const buildingIds = site.buildings.map((b) => b.id);
      if (buildingIds.length > 0) {
        await prisma.storageArea.deleteMany({ where: { buildingId: { in: buildingIds } } });
        await prisma.building.deleteMany({ where: { id: { in: buildingIds } } });
      }

      await prisma.site.delete({ where: { id: siteId } });
      return reply.send({ success: true });
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

  // GET /api/v1/sites/tree — full hierarchy for Location Browser
  // NOTE: must be registered before /sites/:siteId/... routes to avoid conflict
  app.get(
    "/sites/tree",
    { preHandler: [app.authenticate] },
    async (_req, reply) => {
      const sites = await prisma.site.findMany({
        orderBy: { name: "asc" },
        include: {
          buildings: {
            orderBy: { name: "asc" },
            include: {
              storageAreas: {
                orderBy: { code: "asc" },
                include: {
                  locations: {
                    orderBy: [{ row: "asc" }, { shelf: "asc" }, { level: "asc" }],
                  },
                },
              },
            },
          },
        },
      });
      return reply.send({ success: true, data: sites });
    }
  );

  // DELETE /api/v1/locations/:locationId
  app.delete(
    "/locations/:locationId",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { locationId } = req.params as { locationId: string };

      const location = await prisma.storageLocation.findUnique({
        where: { id: locationId },
      });
      if (!location) {
        return reply.status(404).send({ success: false, error: "Location not found" });
      }

      const activeItemCount = await prisma.item.count({
        where: { locationId, status: "IN_STORAGE" },
      });
      if (activeItemCount > 0) {
        return reply.status(409).send({
          success: false,
          error: `Cannot delete: ${activeItemCount} item${activeItemCount !== 1 ? "s" : ""} stored at this location`,
        });
      }

      const containerCount = await prisma.container.count({
        where: { locationId },
      });
      if (containerCount > 0) {
        return reply.status(409).send({
          success: false,
          error: `Cannot delete: ${containerCount} container${containerCount !== 1 ? "s" : ""} at this location`,
        });
      }

      await prisma.storageLocation.delete({ where: { id: locationId } });
      return reply.send({ success: true });
    }
  );

  // DELETE /api/v1/areas/:areaId
  app.delete(
    "/areas/:areaId",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { areaId } = req.params as { areaId: string };

      const area = await prisma.storageArea.findUnique({
        where: { id: areaId },
        include: { locations: { select: { id: true } } },
      });
      if (!area) {
        return reply.status(404).send({ success: false, error: "Storage area not found" });
      }

      const locationIds = area.locations.map((l) => l.id);

      if (locationIds.length > 0) {
        const activeItemCount = await prisma.item.count({
          where: { locationId: { in: locationIds }, status: "IN_STORAGE" },
        });
        if (activeItemCount > 0) {
          return reply.status(409).send({
            success: false,
            error: `Cannot delete: ${activeItemCount} item${activeItemCount !== 1 ? "s" : ""} stored in this area`,
          });
        }

        const containerCount = await prisma.container.count({
          where: { locationId: { in: locationIds } },
        });
        if (containerCount > 0) {
          return reply.status(409).send({
            success: false,
            error: `Cannot delete: ${containerCount} container${containerCount !== 1 ? "s" : ""} in this area`,
          });
        }

        await prisma.storageLocation.deleteMany({ where: { storageAreaId: areaId } });
      }

      await prisma.storageArea.delete({ where: { id: areaId } });
      return reply.send({ success: true });
    }
  );

  // DELETE /api/v1/buildings/:buildingId
  app.delete(
    "/buildings/:buildingId",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { buildingId } = req.params as { buildingId: string };

      const building = await prisma.building.findUnique({
        where: { id: buildingId },
        include: {
          storageAreas: {
            include: { locations: { select: { id: true } } },
          },
        },
      });
      if (!building) {
        return reply.status(404).send({ success: false, error: "Building not found" });
      }

      const locationIds = building.storageAreas.flatMap((a) => a.locations.map((l) => l.id));

      if (locationIds.length > 0) {
        const activeItemCount = await prisma.item.count({
          where: { locationId: { in: locationIds }, status: "IN_STORAGE" },
        });
        if (activeItemCount > 0) {
          return reply.status(409).send({
            success: false,
            error: `Cannot delete: ${activeItemCount} item${activeItemCount !== 1 ? "s" : ""} stored in this building`,
          });
        }

        const containerCount = await prisma.container.count({
          where: { locationId: { in: locationIds } },
        });
        if (containerCount > 0) {
          return reply.status(409).send({
            success: false,
            error: `Cannot delete: ${containerCount} container${containerCount !== 1 ? "s" : ""} in this building`,
          });
        }

        await prisma.storageLocation.deleteMany({ where: { id: { in: locationIds } } });
      }

      await prisma.storageArea.deleteMany({ where: { buildingId } });
      await prisma.building.delete({ where: { id: buildingId } });
      return reply.send({ success: true });
    }
  );

  // PATCH /api/v1/sites/:siteId — rename site
  app.patch(
    "/sites/:siteId",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { siteId } = req.params as { siteId: string };
      const body = RenameSiteBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) {
        return reply.status(404).send({ success: false, error: "Site not found" });
      }

      const conflict = await prisma.site.findFirst({
        where: { name: body.data.name, id: { not: siteId } },
      });
      if (conflict) {
        return reply.status(409).send({ success: false, error: "A site with this name already exists" });
      }

      const updated = await prisma.site.update({ where: { id: siteId }, data: { name: body.data.name } });
      return reply.send({ success: true, data: updated });
    }
  );

  // PATCH /api/v1/buildings/:buildingId — rename building
  app.patch(
    "/buildings/:buildingId",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { buildingId } = req.params as { buildingId: string };
      const body = RenameBuildingBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const building = await prisma.building.findUnique({ where: { id: buildingId } });
      if (!building) {
        return reply.status(404).send({ success: false, error: "Building not found" });
      }

      const conflict = await prisma.building.findFirst({
        where: { siteId: building.siteId, name: body.data.name, id: { not: buildingId } },
      });
      if (conflict) {
        return reply.status(409).send({ success: false, error: "A building with this name already exists in this site" });
      }

      const updated = await prisma.building.update({ where: { id: buildingId }, data: { name: body.data.name } });
      return reply.send({ success: true, data: updated });
    }
  );

  // PATCH /api/v1/areas/:areaId — rename area
  app.patch(
    "/areas/:areaId",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { areaId } = req.params as { areaId: string };
      const body = RenameAreaBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const area = await prisma.storageArea.findUnique({
        where: { id: areaId },
        include: { locations: true },
      });
      if (!area) {
        return reply.status(404).send({ success: false, error: "Storage area not found" });
      }

      const conflict = await prisma.storageArea.findFirst({
        where: { buildingId: area.buildingId, code: body.data.code, id: { not: areaId } },
      });
      if (conflict) {
        return reply.status(409).send({ success: false, error: "An area with this code already exists in this building" });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const renamedArea = await tx.storageArea.update({ where: { id: areaId }, data: { code: body.data.code } });

        // Regenerate stored labels for all child locations — label format: "{areaCode}-{row}-{shelf}-{level}"
        for (const loc of area.locations) {
          await tx.storageLocation.update({
            where: { id: loc.id },
            data: { label: `${body.data.code}-${loc.row}-${loc.shelf}-${loc.level}` },
          });
        }

        return renamedArea;
      });

      return reply.send({ success: true, data: updated });
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
