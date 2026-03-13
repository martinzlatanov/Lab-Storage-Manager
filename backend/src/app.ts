import Fastify from "fastify";
import corsPlugin from "./plugins/cors.js";
import helmetPlugin from "./plugins/helmet.js";
import authPlugin from "./plugins/auth.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import sitesRoutes from "./routes/sites.js";
import externalLocationsRoutes from "./routes/external-locations.js";
import usersRoutes from "./routes/users.js";
import containersRoutes from "./routes/containers.js";
import itemsRoutes from "./routes/items.js";
import operationsRoutes from "./routes/operations.js";
import reportsRoutes from "./routes/reports.js";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      ...(process.env.NODE_ENV === "development" && {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
    },
  });

  // ── Security plugins ──────────────────────────────────────────────────────
  app.register(helmetPlugin);
  app.register(corsPlugin);

  // ── Auth plugin (must be registered before protected routes) ─────────────
  app.register(authPlugin);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/api/v1" });
  app.register(sitesRoutes, { prefix: "/api/v1" });
  app.register(externalLocationsRoutes, { prefix: "/api/v1" });
  app.register(usersRoutes, { prefix: "/api/v1" });
  app.register(containersRoutes, { prefix: "/api/v1" });
  app.register(itemsRoutes, { prefix: "/api/v1" });
  app.register(operationsRoutes, { prefix: "/api/v1" });
  app.register(reportsRoutes, { prefix: "/api/v1" });

  // ── Global error handler ──────────────────────────────────────────────────
  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);

    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      success: false,
      error: statusCode >= 500 ? "Internal server error" : error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  });

  return app;
}
