import { prisma } from "../../lib/prisma.js";

export class AnalyticsService {
  static async refreshDepartment(departmentId: string, periodStart = new Date(new Date().getFullYear(), 0, 1), periodEnd = new Date()) {
    const rows = await prisma.dimensionScore.findMany({ where: { scoreResult: { session: { status: "completed", departmentIdAtTime: departmentId } } } });
    const byDimension = new Map<string, number[]>();
    for (const row of rows) byDimension.set(row.dimensionId, [...(byDimension.get(row.dimensionId) ?? []), Number(row.score)]);
    return Promise.all([...byDimension.entries()].map(([dimensionId, values]) => prisma.departmentAggregateScore.upsert({
      where: { departmentId_dimensionId_periodStart_periodEnd: { departmentId, dimensionId, periodStart, periodEnd } },
      update: { avgScore: values.reduce((a, b) => a + b, 0) / values.length, sampleSize: values.length },
      create: { departmentId, dimensionId, periodStart, periodEnd, avgScore: values.reduce((a, b) => a + b, 0) / values.length, sampleSize: values.length }
    })));
  }
}
