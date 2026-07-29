import type { FastifyInstance } from "fastify";
import { RecommendationCategory } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "../../lib/auth.js";
import { prisma } from "../../lib/prisma.js";
import { formatHeairContext, retrieveHeairContext } from "../knowledge/retrieval.js";
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
const assessmentRole = z.enum(["student", "faculty", "leadership", "business_affairs", "communications"]);
const profileInput = z.object({
  role: assessmentRole.optional(),
  institutionName: z.string().trim().min(2).max(180).optional()
}).refine((value) => Boolean(value.role || value.institutionName), { message: "Provide an account setting." });
const saveResultInput = z.object({
  role: assessmentRole,
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
const activeAssessmentRoles = ["student", "faculty", "leadership", "business_affairs", "communications"] as const;
const minimumCohortRespondents = 5;

function cleanInstitutionName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

type InstitutionComparison = {
  available: boolean;
  institutionName: string | null;
  sampleSize: number;
  averageScore: number | null;
  difference: number | null;
  dimensions: Array<{ dimension: string; averageScore: number; userScore: number; difference: number }>;
};

type ScoreProfileItem = { dimension: string; score: number };

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function dimensionAverages(scores: ScoreProfileItem[]) {
  const grouped = new Map<string, number[]>();
  for (const score of scores) grouped.set(score.dimension, [...(grouped.get(score.dimension) ?? []), Number(score.score)]);
  return new Map([...grouped].map(([dimension, values]) => [dimension, average(values)]));
}

async function getInstitutionComparison(institutionId: string | null, institutionName: string | null, role: string | null, score: number, currentScores: ScoreProfileItem[] = []): Promise<InstitutionComparison> {
  const unavailable = { available: false, institutionName, sampleSize: 0, averageScore: null, difference: null, dimensions: [] };
  if (!institutionId || !role || !activeAssessmentRoles.includes(role as (typeof activeAssessmentRoles)[number])) return unavailable;
  const sessions = await prisma.assessmentSession.findMany({
    where: { status: "completed", roleAtTime: role as (typeof activeAssessmentRoles)[number], user: { institutionId }, scoreResult: { isNot: null } },
    orderBy: { completedAt: "desc" },
    select: {
      userId: true,
      scoreResult: { select: { overallScore: true, dimensionScores: { select: { score: true, dimension: { select: { label: true } } } } } }
    }
  });
  // One current result per account prevents repeat attempts from affecting a cohort average.
  const latestByUser = new Map<string, (typeof sessions)[number]>();
  for (const session of sessions) if (!latestByUser.has(session.userId)) latestByUser.set(session.userId, session);
  const latestSessions = [...latestByUser.values()].filter((session) => Boolean(session.scoreResult));
  if (latestSessions.length < minimumCohortRespondents) return { ...unavailable, sampleSize: latestSessions.length };

  const cohortScores = latestSessions.map((session) => Number(session.scoreResult!.overallScore));
  const cohortDimensions = new Map<string, number[]>();
  for (const session of latestSessions) {
    for (const dimensionScore of session.scoreResult!.dimensionScores) {
      const label = dimensionScore.dimension.label;
      cohortDimensions.set(label, [...(cohortDimensions.get(label) ?? []), Number(dimensionScore.score)]);
    }
  }
  const personalDimensions = dimensionAverages(currentScores);
  const dimensions = Object.keys(dimensionIds).flatMap((dimension) => {
    const cohort = cohortDimensions.get(dimension);
    const userScore = personalDimensions.get(dimension);
    if (!cohort?.length || userScore === undefined) return [];
    const averageScore = rounded(average(cohort));
    return [{ dimension, averageScore, userScore: rounded(userScore), difference: rounded(userScore - averageScore) }];
  });
  const averageScore = rounded(average(cohortScores));
  return { available: true, institutionName, sampleSize: latestSessions.length, averageScore, difference: rounded(score - averageScore), dimensions };
}

function roleLabel(role: string) {
  return ({ student: "Student", faculty: "Faculty", leadership: "Leadership", business_affairs: "Business Affairs", communications: "Communications" } as Record<string, string>)[role] ?? role;
}

function asksAboutAnotherNamedInstitution(question: string, institutionName: string) {
  const match = question.toLocaleLowerCase().match(/\bunc(?:\s+[a-z]+){1,3}\b|\b(?:university|college|institute)\s+(?:of\s+)?(?:[a-z]+\s*){1,5}/i);
  if (!match) return false;
  const ignored = new Set(["unc", "university", "college", "institute", "of", "the", "at", "for", "from", "my", "our", "your", "a", "an", "and", "readiness", "average", "averages", "score", "scores", "student", "students", "faculty", "leadership", "business", "affairs", "communications"]);
  const requestedWords = match[0].toLocaleLowerCase().match(/[a-z]+/g)?.filter((word) => !ignored.has(word)) ?? [];
  if (!requestedWords.length) return false;
  const accountWords = new Set(institutionName.toLocaleLowerCase().match(/[a-z]+/g) ?? []);
  return !requestedWords.every((word) => accountWords.has(word));
}

function cohortContext(comparison: InstitutionComparison, role: string) {
  if (!comparison.available) return `No institution cohort statistics are available yet. Do not estimate them. Anonymous comparison requires at least ${minimumCohortRespondents} distinct ${roleLabel(role)} accounts at this institution to complete an assessment.`;
  const dimensions = comparison.dimensions.map((item) => `${item.dimension}: cohort ${item.averageScore}, user ${item.userScore}`).join("; ");
  return `Anonymous cohort statistics for the verified institution only: ${comparison.sampleSize} distinct ${roleLabel(role)} accounts, average overall score ${comparison.averageScore}, user difference ${comparison.difference} points. Dimension comparisons: ${dimensions}.`;
}

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
  app.get("/public/insights", async (_request, reply) => {
    try {
      const sessions = await prisma.assessmentSession.findMany({
        where: { status: "completed", roleAtTime: { in: [...activeAssessmentRoles] } },
        select: { roleAtTime: true, scoreResult: { select: { overallScore: true } } }
      });
      const insights = activeAssessmentRoles.map((role) => {
        const scores = sessions.filter((session) => session.roleAtTime === role && session.scoreResult).map((session) => Number(session.scoreResult?.overallScore));
        // Do not expose a role average until at least three respondents protect anonymity.
        if (scores.length < 3) return { role, responseCount: scores.length, averageScore: null };
        return { role, responseCount: scores.length, averageScore: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 };
      });
      return { insights };
    } catch {
      return reply.code(503).send({ error: "Assessment insights are temporarily unavailable." });
    }
  });

  app.patch("/public/profile", async (request, reply) => {
    const body = profileInput.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid profile." });
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "Sign in to save an assessment." });
    if (user.role && body.data.role && user.role !== body.data.role) return reply.code(409).send({ error: "Your stakeholder role is fixed for this account." });

    let institutionId = user.institutionId;
    if (body.data.institutionName) {
      const institutionName = cleanInstitutionName(body.data.institutionName);
      if (user.institution && user.institution.name.toLocaleLowerCase() !== institutionName.toLocaleLowerCase()) {
        return reply.code(409).send({ error: "Your institution is fixed for this account." });
      }
      if (!institutionId) {
        const institution = await prisma.institution.upsert({ where: { name: institutionName }, update: {}, create: { name: institutionName } });
        institutionId = institution.id;
      }
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: user.role ?? body.data.role, institutionId },
      select: { id: true, email: true, fullName: true, role: true, institution: { select: { id: true, name: true } } }
    });
    return updated;
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
    const results = await Promise.all(sessions.map(async (session) => {
      const overallScore = session.scoreResult ? Number(session.scoreResult.overallScore) : null;
      const scores = session.scoreResult?.subDimensionScores.map((score) => ({
        subDimension: score.subDimension.label,
        dimension: score.subDimension.dimension.label,
        score: Number(score.score)
      })) ?? [];
      return {
        id: session.id,
        role: session.roleAtTime,
        completedAt: session.completedAt,
        overallScore,
        scores,
        report: session.report ? { summary: session.report.summaryText, data: session.report.structuredData, recommendations: session.report.recommendations } : null,
        institutionComparison: overallScore === null ? null : await getInstitutionComparison(user.institutionId, user.institution?.name ?? null, session.roleAtTime, overallScore, scores)
      };
    }));
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, institution: user.institution },
      results
    };
  });

  app.post("/public/results", async (request, reply) => {
    const body = saveResultInput.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid assessment result." });
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "Sign in to save an assessment." });
    if (!user.role || !user.institutionId) return reply.code(400).send({ error: "Complete your stakeholder role and institution before saving an assessment." });
    if (body.data.role !== user.role) return reply.code(403).send({ error: "Assessments must use the stakeholder role fixed to your account." });
    const subScores = body.data.scores.map((score) => ({ subDimensionId: subDimensionIds[score.subDimension], score: score.score, responseCount: 1 })).filter((score): score is { subDimensionId: string; score: number; responseCount: number } => Boolean(score.subDimensionId));
    const dimensionScores = Object.entries(dimensionIds).map(([label, dimensionId]) => {
      const values = body.data.scores.filter((score) => score.dimension === label).map((score) => score.score);
      return { dimensionId, score: values.reduce((sum, value) => sum + value, 0) / values.length };
    });
    if (subScores.length !== 12 || dimensionScores.some((score) => Number.isNaN(score.score))) return reply.code(400).send({ error: "Assessment score profile is incomplete." });
    const saved = await prisma.$transaction(async (tx) => {
      const session = await tx.assessmentSession.create({ data: { userId: user.id, roleAtTime: user.role!, status: "completed", completedAt: new Date() } });
      const result = await tx.scoreResult.create({ data: { sessionId: session.id, overallScore: body.data.overallScore, dimensionScores: { create: dimensionScores }, subDimensionScores: { create: subScores } } });
      const report = toSavedReport(body.data.report);
      await tx.readinessReport.create({ data: { sessionId: session.id, overallScore: body.data.overallScore, summaryText: report.summaryText, structuredData: report.structuredData, recommendations: report.recommendations } });
      return { sessionId: session.id, scoreResultId: result.id };
    });
    const institutionComparison = await getInstitutionComparison(user.institutionId, user.institution?.name ?? null, user.role, body.data.overallScore, body.data.scores);
    return reply.code(201).send({ ...saved, institutionComparison });
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
    const user = await currentUser(request);
    if (!user) return reply.code(401).send({ error: "Sign in to use the AI readiness coach." });
    if (!user.role || !user.institutionId || !user.institution?.name) return reply.code(400).send({ error: "Complete your account before using the AI readiness coach." });
    if (body.data.role !== user.role) return reply.code(403).send({ error: "The coach can only discuss the stakeholder role saved to your account." });
    if (!process.env.ANTHROPIC_API_KEY) return reply.code(503).send({ error: "AI score chat is not configured." });
    try {
      const latestQuestion = [...body.data.messages].reverse().find((message) => message.role === "user")?.content ?? "";
      if (asksAboutAnotherNamedInstitution(latestQuestion, user.institution.name)) {
        return {
          message: `I can only discuss anonymous readiness data for ${user.institution.name}, the institution saved to your account. I cannot provide data for other institutions.`,
          sources: []
        };
      }
      if (/\b(?:who|which person)\b.*\b(?:highest|top|scored|score)\b|\bhighest scorer\b/i.test(latestQuestion)) {
        return {
          message: `I cannot identify or rank people. I can share anonymous ${roleLabel(user.role)} averages for ${user.institution.name} when enough completed assessments are available.`,
          sources: []
        };
      }
      const institutionComparison = await getInstitutionComparison(user.institutionId, user.institution.name, user.role, body.data.overallScore, body.data.scores);
      const retrievedContext = await retrieveHeairContext(body.data.role, body.data.scores, 6, latestQuestion);
      const heairContext = formatHeairContext(retrievedContext);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
          max_tokens: 350,
          system: `You are a friendly HEAIR readiness coach. The retrieved HEAIR framework context below is your source of truth. Speak in clear, natural English for a ${body.data.role}. Answer the user's exact question first, then connect the answer to their score profile and role. Give at least one concrete activity, safeguard, or practice that appears in the retrieved HEAIR context. Do not invent courses, tools, institutional policies, budgets, or facts not supported by the retrieved context. Never claim to know the user's institution's policies; advise them to verify local policy when needed. Give practical guidance in 140 words or fewer, using two to four short paragraphs or at most three short bullets. Do not use headings, tables, citations, jargon, or Markdown formatting.\n\nInstitution privacy rules: The user is verified as a ${roleLabel(user.role)} at ${user.institution.name}. You may discuss only the anonymous cohort statistics supplied below for this verified institution and role. Never provide, infer, compare, or speculate about another institution. If asked about another university, say you can only discuss anonymous data for ${user.institution.name}. Never identify people, list people, or rank who scored highest. Do not estimate missing cohort statistics.\n\nScore profile: ${JSON.stringify({ overallScore: body.data.overallScore, scores: body.data.scores })}\n\n${cohortContext(institutionComparison, user.role)}\n\nRetrieved HEAIR framework context:\n${heairContext}`,
          messages: body.data.messages
        })
      });
      if (!response.ok) return reply.code(502).send({ error: "The AI coach is temporarily unavailable." });
      const payload = await response.json() as { content?: Array<{ type: string; text?: string }> };
      const message = payload.content?.find((part) => part.type === "text")?.text?.trim();
      if (!message) return reply.code(502).send({ error: "The AI coach returned no answer." });
      return {
        message,
        sources: [...new Map(retrievedContext.map((chunk) => [`${chunk.sourceTitle}:${chunk.section}`, { title: chunk.sourceTitle, section: chunk.section, citation: chunk.citation }])).values()].slice(0, 3)
      };
    } catch { return reply.code(502).send({ error: "The AI coach is temporarily unavailable." }); }
  });
}
