import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { generatePublicAiReport } from "./anthropic.js";

const input = z.object({
  role: z.string().min(1).max(80),
  overallScore: z.number().min(0).max(100),
  scores: z.array(z.object({ subDimension: z.string().min(1).max(100), dimension: z.string().min(1).max(100), score: z.number().min(0).max(100) })).min(4).max(12)
});

const chatInput = z.object({
  role: z.string().min(1).max(80),
  overallScore: z.number().min(0).max(100),
  scores: z.array(z.object({ subDimension: z.string().min(1).max(100), dimension: z.string().min(1).max(100), score: z.number().min(0).max(100) })).min(4).max(12),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1200) })).min(1).max(12)
});

/**
 * Public, PII-free endpoint for the GitHub Pages demo. Protect this route with
 * rate limiting/WAF controls before production deployment to avoid API-cost abuse.
 */
export async function publicRecommendationRoutes(app: FastifyInstance) {
  app.post("/public/recommendations", async (request, reply) => {
    const body = input.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid recommendation request." });
    try { return { report: await generatePublicAiReport(body.data.role, body.data.overallScore, body.data.scores) }; }
    catch { return reply.code(502).send({ error: "AI recommendations are temporarily unavailable." }); }
  });

  app.post("/public/score-chat", async (request, reply) => {
    const body = chatInput.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid score chat request." });
    if (!process.env.ANTHROPIC_API_KEY) return reply.code(503).send({ error: "AI score chat is not configured." });
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
          max_tokens: 500,
          system: `You are a friendly HEAIR readiness coach. Speak in clear, natural English for a ${body.data.role}. Answer only from the supplied score profile and conversation. Give practical, achievable suggestions. Use short paragraphs and, when helpful, a brief bulleted list. Do not use headings, tables, citations, jargon, or Markdown formatting. Never invent an institution's policy; advise the user to check their institution when policy-specific details matter. Score profile: ${JSON.stringify({ overallScore: body.data.overallScore, scores: body.data.scores })}`,
          messages: body.data.messages
        })
      });
      if (!response.ok) return reply.code(502).send({ error: "The AI coach is temporarily unavailable." });
      const payload = await response.json() as { content?: Array<{ type: string; text?: string }> };
      const message = payload.content?.find((part) => part.type === "text")?.text?.trim();
      if (!message) return reply.code(502).send({ error: "The AI coach returned no answer." });
      return { message };
    } catch { return reply.code(502).send({ error: "The AI coach is temporarily unavailable." }); }
  });
}
