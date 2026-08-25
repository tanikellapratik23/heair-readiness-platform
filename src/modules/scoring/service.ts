import { QuestionType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { METHODOLOGY_VERSION, coverageFromCounts, isExcludedResponse, normalizeLikert, type AssessmentResponseValue } from "../../lib/assessment-methodology.js";

function rawResponse(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).value : value;
}

export function normalizeResponse(value: unknown, type: QuestionType, scoringKey: Prisma.JsonValue | null): number | null {
  if (isExcludedResponse(value as AssessmentResponseValue)) return null;
  if (type === "likert_5") return normalizeLikert(value as AssessmentResponseValue);
  const raw = rawResponse(value);
  if (type === "yes_no" && typeof raw === "boolean") return raw ? 100 : 0;
  if (type === "yes_no" && (raw === "yes" || raw === "no")) return raw === "yes" ? 100 : 0;
  if (type === "multiple_choice" && typeof raw === "string" && scoringKey && typeof scoringKey === "object" && !Array.isArray(scoringKey)) {
    const n = (scoringKey as Record<string, unknown>)[raw]; return typeof n === "number" ? n : null;
  }
  return null;
}

export class ScoringService {
  static async scoreSession(sessionId: string) {
    const [session, responses] = await Promise.all([
      prisma.assessmentSession.findUnique({ where: { id: sessionId }, select: { roleAtTime: true, methodologyVersion: true } }),
      prisma.questionResponse.findMany({ where: { sessionId }, include: { question: { include: { subDimension: true } } } })
    ]);
    if (!session) throw new Error("Assessment session not found.");
    const expectedQuestions = await prisma.question.count({ where: { active: true, sessionScoped: false, role: session.roleAtTime } });
    const buckets = new Map<string, { weighted: number; weights: number; count: number; dimensionId: string }>();
    let excludedResponses = 0;
    let scoredResponses = 0;
    for (const response of responses) {
      const value = response.responseValue as AssessmentResponseValue;
      if (isExcludedResponse(value)) excludedResponses += 1;
      const normalized = normalizeResponse(value, response.question.questionType, response.question.scoringKey);
      if (normalized === null) continue;
      const key = response.question.subDimensionId;
      const bucket = buckets.get(key) ?? { weighted: 0, weights: 0, count: 0, dimensionId: response.question.subDimension.dimensionId };
      const weight = Number(response.question.weight);
      bucket.weighted += normalized * weight; bucket.weights += weight; bucket.count++; buckets.set(key, bucket); scoredResponses += 1;
    }
    const subScores = [...buckets.entries()].map(([subDimensionId, b]) => ({ subDimensionId, score: b.weighted / b.weights, responseCount: b.count, dimensionId: b.dimensionId }));
    const dimensionBuckets = new Map<string, number[]>();
    for (const score of subScores) dimensionBuckets.set(score.dimensionId, [...(dimensionBuckets.get(score.dimensionId) ?? []), score.score]);
    const dimensionScores = [...dimensionBuckets.entries()].map(([dimensionId, values]) => ({ dimensionId, score: values.reduce((a, b) => a + b, 0) / values.length }));
    if (!dimensionScores.length) throw new Error("No numerically scorable responses were submitted.");
    const overallScore = dimensionScores.reduce((sum, row) => sum + row.score, 0) / dimensionScores.length;
    const coverage = coverageFromCounts({ totalQuestions: expectedQuestions, answered: responses.length, scored: scoredResponses, excluded: excludedResponses });
    return prisma.scoreResult.upsert({
      where: { sessionId },
      update: { overallScore, computedAt: new Date(), methodologyVersion: session.methodologyVersion || METHODOLOGY_VERSION, scoredResponseCount: coverage.scored, excludedResponseCount: coverage.excluded + coverage.unanswered, responseCoveragePercent: coverage.percentage, dimensionScores: { deleteMany: {}, create: dimensionScores }, subDimensionScores: { deleteMany: {}, create: subScores.map(({ dimensionId, ...row }) => row) } },
      create: { sessionId, overallScore, methodologyVersion: session.methodologyVersion || METHODOLOGY_VERSION, scoredResponseCount: coverage.scored, excludedResponseCount: coverage.excluded + coverage.unanswered, responseCoveragePercent: coverage.percentage, dimensionScores: { create: dimensionScores }, subDimensionScores: { create: subScores.map(({ dimensionId, ...row }) => row) } },
      include: { dimensionScores: { include: { dimension: true } }, subDimensionScores: { include: { subDimension: { include: { dimension: true } } } } }
    });
  }
}
