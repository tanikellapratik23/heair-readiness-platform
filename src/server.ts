import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { ZodError } from "zod";
import { authRoutes } from "./modules/auth/routes.js";
import { assessmentRoutes } from "./modules/assessments/routes.js";
import { reportRoutes } from "./modules/reports/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "development-only-secret-change-me" });
app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) return reply.code(400).send({ error: "Invalid request", details: error.flatten() });
  app.log.error(error); return reply.code(500).send({ error: "Internal server error" });
});
app.get("/health", async () => ({ status: "ok", service: "heair-readiness-platform" }));
await app.register(authRoutes);
await app.register(assessmentRoutes);
await app.register(reportRoutes);
await app.register(analyticsRoutes);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
