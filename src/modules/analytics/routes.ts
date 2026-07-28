import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics/individual/:userId", async (request, reply) => {
    const user = await currentUser(request); const userId = (request.params as { userId: string }).userId; if (user?.id !== userId && user?.systemRole === "self") return fail(reply, 403, "Not permitted.");
    return prisma.scoreResult.findMany({ where: { session: { userId } }, include: { session: true, dimensionScores: { include: { dimension: true } } }, orderBy: { computedAt: "desc" } });
  });
  app.get("/analytics/department/:departmentId", async (request, reply) => {
    const user = await currentUser(request); const departmentId = (request.params as { departmentId: string }).departmentId; if (user?.departmentId !== departmentId && user?.systemRole === "self") return fail(reply, 403, "Not permitted.");
    return prisma.departmentAggregateScore.findMany({ where: { departmentId }, include: { dimension: true }, orderBy: [{ periodEnd: "desc" }, { dimension: { sortOrder: "asc" } }] });
  });
  app.get("/analytics/institution/:institutionId", async (request, reply) => {
    const user = await currentUser(request); const institutionId = (request.params as { institutionId: string }).institutionId; if (user?.institutionId !== institutionId && user?.systemRole === "self") return fail(reply, 403, "Not permitted.");
    const scores = await prisma.dimensionScore.groupBy({ by: ["dimensionId"], where: { scoreResult: { session: { user: { institutionId } } } }, _avg: { score: true }, _count: { id: true } });
    return scores;
  });
}
