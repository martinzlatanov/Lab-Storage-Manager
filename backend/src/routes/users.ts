import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { prisma } from "../lib/prisma.js";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${hash.toString("hex")}:${salt}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hash, salt] = stored.split(":");
  if (!hash || !salt) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const derivedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuffer, derivedBuffer);
}

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

const ChangePasswordBody = z.object({
  newPassword: z.string().min(8).max(128),
  currentPassword: z.string().optional(), // required for non-admins changing own password
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

  // PATCH /api/v1/users/:id/password
  // Admin: can set any user's password (no current password required)
  // Any authenticated user: can change own password (must supply currentPassword)
  app.patch(
    "/users/:id/password",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const isAdmin = req.user.role === "ADMIN";
      const isSelf = req.user.id === id;

      if (!isAdmin && !isSelf) {
        return reply.status(403).send({ success: false, error: "Forbidden" });
      }

      const body = ChangePasswordBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ success: false, error: "Invalid request body — newPassword must be 8–128 characters" });
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ success: false, error: "User not found" });
      }

      // Non-admins must verify their current password before changing it
      if (!isAdmin) {
        if (!body.data.currentPassword) {
          return reply.status(400).send({ success: false, error: "currentPassword is required" });
        }
        if (!existing.passwordHash) {
          return reply.status(400).send({ success: false, error: "No local password set — contact an admin to set an initial password" });
        }
        const valid = await verifyPassword(body.data.currentPassword, existing.passwordHash);
        if (!valid) {
          return reply.status(400).send({ success: false, error: "Current password is incorrect" });
        }
      }

      const passwordHash = await hashPassword(body.data.newPassword);
      await prisma.user.update({ where: { id }, data: { passwordHash } });

      return reply.send({ success: true, data: null });
    }
  );
}
