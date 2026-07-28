import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateAiSummary } from "./anthropic.js";

const input = z.object({
  role: z.string().min(1).max(80),
  overallScore: z.number().min(0).max(100),
  weakest: z.array(z.object({ subDimension: z.string().min(1).max(100), score: z.number().min(0).max(100) })).min(1).max(3),
  strongest: z.array(z.object({ subDimension: z.string().min(1).max(100), score: z.number().min(0).max(100) })).min(1).max(3)
});

/**
 * Public, PII-free endpoint for the GitHub Pages demo. Protect this route with
 * rate limiting/WAF controls before production deployment to avoid API-cost abuse.
 */
export async function publicRecommendationRoutes(app: FastifyInstance) {
  app.post("/public/recommendations", async (request, reply) => {
    const body = input.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid recommendation request." });
    try { return { summary: await generateAiSummary(body.data.role, body.data.overallScore, body.data.weakest, body.data.strongest) }; }
    catch { return reply.code(502).send({ error: "AI recommendations are temporarily unavailable." }); }
  });
}
