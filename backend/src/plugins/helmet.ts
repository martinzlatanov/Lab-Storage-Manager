import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

export default fp(async function helmetPlugin(app: FastifyInstance) {
  await app.register(helmet, {
    // CSP disabled here — configure per deployment if needed
    contentSecurityPolicy: false,
  });
});
