import { QuestionType, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

function normalize(value: unknown, type: QuestionType, scoringKey: Prisma.JsonValue | null): number | null {
  if (type === "likert_5" && typeof value === "number" && value >= 1 && value <= 5) return (value - 1) * 25;
  if (type === "yes_no" && typeof value === "boolean") return value ? 100 : 0;
  if (type === "yes_no" && (value === "yes" || value === "no")) return value === "yes" ? 100 : 0;
  if (type === "multiple_choice" && typeof value === "string" && scoringKey && typeof scoringKey === "object" && !Array.isArray(scoringKey)) {
    const n = (scoringKey as Record<string, unknown>)[value]; return typeof n === "number" ? n : null;
  }
  return null;
}

export class ScoringService {
  static async scoreSession(sessionId: string) {
    const responses = await prisma.questionResponse.findMany({ where: { sessionId }, include: { question: { include: { subDimension: true } } } });
    const buckets = new Map<string, { weighted: number; weights: number; count: number; dimensionId: string }>();
    for (const response of responses) {
      const normalized = normalize(response.responseValue, response.question.questionType, response.question.scoringKey);
      if (normalized === null) continue;
      const key = response.question.subDimensionId;
      const bucket = buckets.get(key) ?? { weighted: 0, weights: 0, count: 0, dimensionId: response.question.subDimension.dimensionId };
      const weight = Number(response.question.weight);
      bucket.weighted += normalized * weight; bucket.weights += weight; bucket.count++; buckets.set(key, bucket);
    }
    const subScores = [...buckets.entries()].map(([subDimensionId, b]) => ({ subDimensionId, score: b.weighted / b.weights, responseCount: b.count, dimensionId: b.dimensionId }));
    const dimensionBuckets = new Map<string, number[]>();
    for (const score of subScores) dimensionBuckets.set(score.dimensionId, [...(dimensionBuckets.get(score.dimensionId) ?? []), score.score]);
    const dimensionScores = [...dimensionBuckets.entries()].map(([dimensionId, values]) => ({ dimensionId, score: values.reduce((a, b) => a + b, 0) / values.length }));
    if (!dimensionScores.length) throw new Error("No numerically scorable responses were submitted.");
    const overallScore = dimensionScores.reduce((sum, row) => sum + row.score, 0) / dimensionScores.length;
    return prisma.scoreResult.upsert({
      where: { sessionId },
      update: { overallScore, computedAt: new Date(), dimensionScores: { deleteMany: {}, create: dimensionScores }, subDimensionScores: { deleteMany: {}, create: subScores.map(({ dimensionId, ...row }) => row) } },
      create: { sessionId, overallScore, dimensionScores: { create: dimensionScores }, subDimensionScores: { create: subScores.map(({ dimensionId, ...row }) => row) } },
      include: { dimensionScores: { include: { dimension: true } }, subDimensionScores: { include: { subDimension: true } } }
    });
  }
}
