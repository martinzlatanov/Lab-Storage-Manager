import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const CreateUserBody = z.object({
  ldapUsername: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER", "VIEWER"]).default("USER"),
  siteId: z.string().optional(),
});

const UpdateUserBody = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "USER", "VIEWER"]).optional(),
  siteId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Fields safe to return — never expose raw password-adjacent data
const userSelect = {
  id: true,
  ldapUsername: true,
  displayName: true,
  email: true,
  role: true,
  siteId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  site: { select: { id: true, name: true } },
} as const;

// ─── Routes ───────────────────────────────────────────────────────────────────

export default async function usersRoutes(app: FastifyInstance) {
  // GET /api/v1/users/me  — must be registered before /users/:id to avoid clash
  app.get(
    "/users/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: userSelect,
      });

      if (!user) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      return reply.send({ success: true, data: user });
    }
  );

  // GET /api/v1/users
  app.get(
    "/users",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const query = req.query as { includeInactive?: string };
      const includeInactive = query.includeInactive === "true";

      const users = await prisma.user.findMany({
        where: includeInactive ? undefined : { isActive: true },
        select: userSelect,
        orderBy: { displayName: "asc" },
      });

      return reply.send({ success: true, data: users });
    }
  );

  // GET /api/v1/users/:id
  app.get(
    "/users/:id",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const user = await prisma.user.findUnique({
        where: { id },
        select: userSelect,
      });

      if (!user) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      return reply.send({ success: true, data: user });
    }
  );

  // POST /api/v1/users — manual account creation (LDAP auto-provision covers the normal case)
  app.post(
    "/users",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const body = CreateUserBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const existing = await prisma.user.findUnique({
        where: { ldapUsername: body.data.ldapUsername },
      });
      if (existing) {
        return reply.status(409).send({ success: false, error: "A user with this LDAP username already exists" });
      }

      if (body.data.siteId) {
        const site = await prisma.site.findUnique({ where: { id: body.data.siteId } });
        if (!site) {
          return reply.status(400).send({ success: false, error: "Site not found" });
        }
      }

      const user = await prisma.user.create({
        data: body.data,
        select: userSelect,
      });

      return reply.status(201).send({ success: true, data: user });
    }
  );

  // PATCH /api/v1/users/:id
  app.patch(
    "/users/:id",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = UpdateUserBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body" });
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      // Prevent the last admin from being demoted or deactivated
      if (
        (body.data.role && body.data.role !== "ADMIN" && existing.role === "ADMIN") ||
        (body.data.isActive === false && existing.role === "ADMIN")
      ) {
        const adminCount = await prisma.user.count({
          where: { role: "ADMIN", isActive: true },
        });
        if (adminCount <= 1) {
          return reply.status(400).send({
            success: false,
            error: "Cannot demote or deactivate the last active admin",
          });
        }
      }

      if (body.data.siteId) {
        const site = await prisma.site.findUnique({ where: { id: body.data.siteId } });
        if (!site) {
          return reply.status(400).send({ success: false, error: "Site not found" });
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: body.data,
        select: userSelect,
      });

      return reply.send({ success: true, data: user });
    }
  );

  // DELETE /api/v1/users/:id — soft deactivate only (users are never hard-deleted)
  app.delete(
    "/users/:id",
    { preHandler: [app.authenticate, app.requireRole("ADMIN")] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      if (!existing.isActive) {
        return reply.status(400).send({ success: false, error: "User is already deactivated" });
      }

      // Prevent deactivating the last admin
      if (existing.role === "ADMIN") {
        const adminCount = await prisma.user.count({
          where: { role: "ADMIN", isActive: true },
        });
        if (adminCount <= 1) {
          return reply.status(400).send({
            success: false,
            error: "Cannot deactivate the last active admin",
          });
        }
      }

      // Revoke all refresh tokens on deactivation
      await prisma.$transaction([
        prisma.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        prisma.user.update({
          where: { id },
          data: { isActive: false },
        }),
      ]);

      return reply.send({ success: true, data: null });
    }
  );
}
