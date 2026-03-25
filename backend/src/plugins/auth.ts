import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { JwtPayload, RequestUser, UserRole } from "../types/index.js";
import { prisma } from "../lib/prisma.js";

// Extend @fastify/jwt's own interface — the correct way to type request.user
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: RequestUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /** Verify access token and populate request.user. Throws 401 on failure. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Require one of the given roles. Must be used after authenticate. */
    requireRole: (
      ...roles: UserRole[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set");
  }

  await app.register(jwt, {
    secret: accessSecret,
    sign: {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    },
  });

  // ── authenticate decorator ───────────────────────────────────────────────
  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = (await req.jwtVerify()) as JwtPayload;
        req.user = {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
          siteId: payload.siteId,
        };
      } catch {
        // Dev-only fallback: allow requests without JWT by using the seeded dev user.
        // Only active in NODE_ENV=development — never reaches production paths.
        if (process.env.NODE_ENV === "development") {
          const devUser = await prisma.user.findUnique({ where: { ldapUsername: "mzlatanov" } });
          if (devUser && devUser.isActive) {
            req.user = {
              id: devUser.id,
              username: devUser.ldapUsername,
              role: devUser.role as RequestUser["role"],
              siteId: devUser.siteId ?? undefined,
            };
            return;
          }
        }
        return reply.status(401).send({ success: false, error: "Unauthorized" });
      }
    }
  );

  // ── requireRole decorator ────────────────────────────────────────────────
  app.decorate(
    "requireRole",
    (...roles: UserRole[]) =>
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.user) {
          return reply.status(401).send({ success: false, error: "Unauthorized" });
        }
        if (!roles.includes(req.user.role)) {
          return reply.status(403).send({ success: false, error: "Forbidden" });
        }
      }
  );

  // Expose refresh secret via app so auth routes can use it directly
  app.decorate("jwtRefreshSecret", refreshSecret);
});

// Augment FastifyInstance for the refresh secret decoration
declare module "fastify" {
  interface FastifyInstance {
    jwtRefreshSecret: string;
  }
}
