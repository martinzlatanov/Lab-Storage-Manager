import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const ExternalLocationBody = z.object({
  name: z.string().min(1).max(100),
  contactPerson: z.string().min(1).max(100),
  address: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  country: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  notes: z.string().max(1000).optional(),
});

const UpdateExternalLocationBody = ExternalLocationBody.partial();

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function externalLocationsRoutes(app: FastifyInstance) {
  // GET /api/v1/external-locations
  app.get(
    "/external-locations",
    { preHandler: [app.authenticate] },
    async (_req, reply) => {
      const locations = await prisma.externalLocation.findMany({
        orderBy: { name: "asc" },
      });
      return reply.send({ success: true, data: locations });
    }
  );

  // GET /api/v1/external-locations/:id
  app.get(
    "/external-locations/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const location = await prisma.externalLocation.findUnique({
        where: { id },
        include: {
          items: {
            where: { status: "TEMP_EXIT" },
            orderBy: { updatedAt: "desc" },
          },
          containers: true,
        },
      });

      if (!location) {
        return reply.status(404).send({ success: false, error: "External location not found" });
      }

      return reply.send({ success: true, data: location });
    }
  );

  // POST /api/v1/external-locations
  app.post(
    "/external-locations",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const body = ExternalLocationBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const location = await prisma.externalLocation.create({ data: body.data });
      return reply.status(201).send({ success: true, data: location });
    }
  );

  // PATCH /api/v1/external-locations/:id
  app.patch(
    "/external-locations/:id",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = UpdateExternalLocationBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const existing = await prisma.externalLocation.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: "External location not found" });
      }

      const location = await prisma.externalLocation.update({
        where: { id },
        data: body.data,
      });
      return reply.send({ success: true, data: location });
    }
  );
}
