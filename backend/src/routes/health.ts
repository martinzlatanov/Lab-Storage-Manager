import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

export default async function healthRoutes(app: FastifyInstance) {
  // GET /health — liveness probe (no DB check)
  app.get("/health", async (_req, reply) => {
    return reply.send({ status: "ok" });
  });

  // GET /health/db — readiness probe (verifies DB connection)
  app.get("/health/db", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: "ok", db: "connected" });
    } catch (err) {
      app.log.error(err, "DB health check failed");
      return reply.status(503).send({ status: "error", db: "unreachable" });
    }
  });
}
