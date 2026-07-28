import type { FastifyInstance } from "fastify";
import { RecommendationCategory, StakeholderRole } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";
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
  messages: z.array(z.discriminatedUnion("role", [
    z.object({ role: z.literal("user"), content: z.string().min(1).max(1200) }),
    z.object({ role: z.literal("assistant"), content: z.string().min(1).max(3000) })
  ])).min(1).max(7)
});

const reportInput = z.object({
  stage: z.string().min(1).max(80),
  headline: z.string().min(1).max(160),
  summary: z.string().min(1).max(2000),
  strengths: z.array(z.object({ title: z.string().min(1).max(120), score: z.number().min(0).max(100), description: z.string().min(1).max(800) })).max(3),
  priorities: z.array(z.object({ title: z.string().min(1).max(120), score: z.number().min(0).max(100), description: z.string().min(1).max(800), actions: z.array(z.string().min(1).max(300)).max(4) })).max(3)
});
const profileInput = z.object({ role: z.nativeEnum(StakeholderRole) });
const saveResultInput = z.object({
  role: z.nativeEnum(StakeholderRole),
  overallScore: z.number().min(0).max(100),
  scores: z.array(z.object({ subDimension: z.string().min(1).max(100), dimension: z.string().min(1).max(100), score: z.number().min(0).max(100) })).length(12),
  report: reportInput
});

const subDimensionIds: Record<string, string> = {
  "Policy & Compliance": "policy_compliance", "AI Governance & Access": "ai_governance_access", "Leadership & Resourcing": "leadership_resourcing", "Monitoring & Evaluation": "monitoring_evaluation",
  "Infrastructure, Privacy & Security": "infrastructure_privacy_security", "Data": "data", "AI Integration & Use Cases": "ai_integration_use_cases",
  "Trust & Transparency": "trust_transparency", "Ethics & Responsible Use": "ethics_responsible_use", "Stakeholder Engagement & Awareness": "stakeholder_engagement_awareness",
  "AI Literacy": "ai_literacy", "Expertise Development": "expertise_development"
};
const dimensionIds: Record<string, string> = { "Governance & Strategy": "governance_strategy", "Systems & Infrastructure": "systems_infrastructure", Culture: "culture", Education: "education" };

function toSavedReport(data: z.infer<typeof reportInput>) {
  const byTitle = (title: string) => subDimensionIds[title] ?? null;
  return {
    summaryText: data.summary,
    structuredData: data,
    recommendations: {
      create: [
        ...data.strengths.map((item, index) => ({ category: RecommendationCategory.strength, subDimensionId: byTitle(item.title), title: item.title, description: item.description, supportingCitationIds: [], sortOrder: index + 1 })),
        ...data.priorities.map((item, index) => ({ category: RecommendationCategory.priority_action, subDimensionId: byTitle(item.title), title: item.title, description: `${item.description}\n${item.actions.map((action) => `• ${action}`).join("\n")}`, supportingCitationIds: [], sortOrder: index + 1 }))
      ]
    }
  };
}

/**
 * Public, PII-free endpoint for the GitHub Pages demo. Protect this route with
 * rate limiting/WAF controls before production deployment to avoid API-cost abuse.
 */
export async function publicRecommendationRoutes(app: FastifyInstance) {
  app.patch("/public/profile", async (request, reply) => {
    const body = profileInput.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid profile." });
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "Sign in to save an assessment." });
    return prisma.user.update({ where: { id: user.id }, data: { role: body.data.role }, select: { id: true, email: true, fullName: true, role: true } });
  });

  app.get("/public/results", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "Sign in to view saved assessments." });
    const sessions = await prisma.assessmentSession.findMany({
      where: { userId: user.id, status: "completed" },
      orderBy: { completedAt: "desc" },
      include: {
        scoreResult: {
          include: {
            dimensionScores: { include: { dimension: true } },
            subDimensionScores: { include: { subDimension: { include: { dimension: true } } } }
          }
        },
        report: { include: { recommendations: true } }
      }
    });
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      results: sessions.map((session) => ({
        id: session.id,
        role: session.roleAtTime,
        completedAt: session.completedAt,
        overallScore: session.scoreResult ? Number(session.scoreResult.overallScore) : null,
        scores: session.scoreResult?.subDimensionScores.map((score) => ({
          subDimension: score.subDimension.label,
          dimension: score.subDimension.dimension.label,
          score: Number(score.score)
        })) ?? [],
        report: session.report ? { summary: session.report.summaryText, data: session.report.structuredData, recommendations: session.report.recommendations } : null
      }))
    };
  });

  app.post("/public/results", async (request, reply) => {
    const body = saveResultInput.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid assessment result." });
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "Sign in to save an assessment." });
    const subScores = body.data.scores.map((score) => ({ subDimensionId: subDimensionIds[score.subDimension], score: score.score, responseCount: 1 })).filter((score): score is { subDimensionId: string; score: number; responseCount: number } => Boolean(score.subDimensionId));
    const dimensionScores = Object.entries(dimensionIds).map(([label, dimensionId]) => {
      const values = body.data.scores.filter((score) => score.dimension === label).map((score) => score.score);
      return { dimensionId, score: values.reduce((sum, value) => sum + value, 0) / values.length };
    });
    if (subScores.length !== 12 || dimensionScores.some((score) => Number.isNaN(score.score))) return reply.code(400).send({ error: "Assessment score profile is incomplete." });
    const saved = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { role: body.data.role } });
      const session = await tx.assessmentSession.create({ data: { userId: user.id, roleAtTime: body.data.role, status: "completed", completedAt: new Date() } });
      const result = await tx.scoreResult.create({ data: { sessionId: session.id, overallScore: body.data.overallScore, dimensionScores: { create: dimensionScores }, subDimensionScores: { create: subScores } } });
      const report = toSavedReport(body.data.report);
      await tx.readinessReport.create({ data: { sessionId: session.id, overallScore: body.data.overallScore, summaryText: report.summaryText, structuredData: report.structuredData, recommendations: report.recommendations } });
      return { sessionId: session.id, scoreResultId: result.id };
    });
    return reply.code(201).send(saved);
  });

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
          max_tokens: 350,
          system: `You are a friendly HEAIR readiness coach. Speak in clear, natural English for a ${body.data.role}. Answer only from the supplied score profile and conversation. Give practical, achievable suggestions in 140 words or fewer. Use two to four short paragraphs, or at most three short bullets. Do not use headings, tables, citations, jargon, or Markdown formatting. Never invent an institution's policy; advise the user to check their institution when policy-specific details matter. Score profile: ${JSON.stringify({ overallScore: body.data.overallScore, scores: body.data.scores })}`,
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
