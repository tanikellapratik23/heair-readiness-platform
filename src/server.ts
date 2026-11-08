import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { ZodError } from "zod";
import { authRoutes } from "./modules/auth/routes.js";
import { assessmentRoutes } from "./modules/assessments/routes.js";
import { reportRoutes } from "./modules/reports/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { publicRecommendationRoutes } from "./modules/recommendations/routes.js";
import { seedCoachEvaluationAccounts } from "../prisma/seed-coach-evaluation.js";
import { removeUncCharlotteDemoComparisons, seedUncCharlotteDemoComparisons } from "../prisma/seed-unc-charlotte-demo-comparisons.js";

// 2 MB private coach uploads are base64-encoded by the browser before they
// reach this JSON API, so leave sufficient room for that encoding overhead.
const app = Fastify({ logger: true, bodyLimit: 3 * 1024 * 1024 });
await app.register(cors, { origin: true });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "development-only-secret-change-me" });
app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) return reply.code(400).send({ error: "Invalid request", details: error.flatten() });
  app.log.error(error); return reply.code(500).send({ error: "Internal server error" });
});
app.get("/health", async () => ({ status: "ok", service: "project-hearmes" }));
await app.register(authRoutes);
await app.register(assessmentRoutes);
await app.register(reportRoutes);
await app.register(analyticsRoutes);
await app.register(adminRoutes);
await app.register(publicRecommendationRoutes);

// Render's free compute plan has no interactive Shell. Temporarily setting
// COACH_EVALUATION_PASSWORD creates the twelve synthetic research-evaluation
// accounts during a deployment. Later starts detect the completed set and do
// nothing, so evaluation conversations are not reset.
if (process.env.COACH_EVALUATION_PASSWORD) {
  const reset = process.env.COACH_EVALUATION_RESET === "true";
  const result = await seedCoachEvaluationAccounts(process.env.COACH_EVALUATION_PASSWORD, reset ? "replace" : "ensure");
  app.log.info({ created: result.created, reset, accountCount: result.accountCount }, "Coach-evaluation accounts checked");
}

// This is an explicit, temporary demo switch—not normal production seeding.
// It creates clearly labelled synthetic records under UNC Charlotte so every
// stakeholder comparison can be demonstrated. Set it to "remove" to delete
// only these exact synthetic accounts before collecting or exporting real data.
const uncCharlotteDemoMode = process.env.UNC_CHARLOTTE_DEMO_COMPARISONS;
if (uncCharlotteDemoMode === "true") {
  const reset = process.env.UNC_CHARLOTTE_DEMO_COMPARISONS_RESET === "true";
  const result = await seedUncCharlotteDemoComparisons(reset ? "replace" : "ensure");
  app.log.warn({ created: result.created, reset, accountCount: result.accountCount, accountsPerRole: result.accountsPerRole }, "UNC Charlotte synthetic demo comparison data checked");
} else if (uncCharlotteDemoMode === "remove") {
  const result = await removeUncCharlotteDemoComparisons();
  app.log.warn(result, "UNC Charlotte synthetic demo comparison data removed");
}

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
