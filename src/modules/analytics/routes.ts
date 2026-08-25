import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";
import { MINIMUM_PEER_RESPONDENTS } from "../../lib/assessment-methodology.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics/individual/:userId", async (request, reply) => {
    const user = await currentUser(request); const userId = (request.params as { userId: string }).userId; if (!user || (user.id !== userId && user.systemRole !== "admin")) return fail(reply, 403, "Not permitted.");
    return prisma.scoreResult.findMany({ where: { session: { userId } }, include: { session: true, dimensionScores: { include: { dimension: true } } }, orderBy: { computedAt: "desc" } });
  });
  app.get("/analytics/department/:departmentId", async (request, reply) => {
    const user = await currentUser(request); const departmentId = (request.params as { departmentId: string }).departmentId; if (!user || (user.systemRole !== "admin" && user.departmentId !== departmentId)) return fail(reply, 403, "Not permitted.");
    const aggregates = await prisma.departmentAggregateScore.findMany({ where: { departmentId, sampleSize: { gte: MINIMUM_PEER_RESPONDENTS } }, include: { dimension: true }, orderBy: [{ periodEnd: "desc" }, { dimension: { sortOrder: "asc" } }] });
    if (!aggregates.length) return { available: false, minimumRequired: MINIMUM_PEER_RESPONDENTS, scores: [] };
    return { available: true, scores: aggregates };
  });
  app.get("/analytics/institution/:institutionId", async (request, reply) => {
    const user = await currentUser(request); const institutionId = (request.params as { institutionId: string }).institutionId; if (!user || (user.systemRole !== "admin" && user.institutionId !== institutionId)) return fail(reply, 403, "Not permitted.");
    const sessions = await prisma.assessmentSession.findMany({
      where: { status: "completed", user: { institutionId }, scoreResult: { isNot: null } },
      orderBy: { completedAt: "desc" },
      select: { userId: true, scoreResult: { select: { dimensionScores: { select: { score: true, dimensionId: true } } } } }
    });
    const latest = new Map<string, (typeof sessions)[number]>(); for (const session of sessions) if (!latest.has(session.userId)) latest.set(session.userId, session);
    if (latest.size < MINIMUM_PEER_RESPONDENTS) return { available: false, minimumRequired: MINIMUM_PEER_RESPONDENTS, scores: [] };
    const byDimension = new Map<string, number[]>();
    for (const session of latest.values()) for (const score of session.scoreResult?.dimensionScores ?? []) byDimension.set(score.dimensionId, [...(byDimension.get(score.dimensionId) ?? []), Number(score.score)]);
    return { available: true, responseCount: latest.size, scores: [...byDimension.entries()].map(([dimensionId, values]) => ({ dimensionId, averageScore: values.reduce((sum, value) => sum + value, 0) / values.length })) };
  });
}
