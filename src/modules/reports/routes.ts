import type { FastifyInstance } from "fastify";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { ReportService } from "./service.js";

export async function reportRoutes(app: FastifyInstance) {
  app.post("/assessments/:id/report", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id; const force = (request.query as { regenerate?: string }).regenerate === "true";
    const session = await prisma.assessmentSession.findUnique({ where: { id } }); if (!session) return fail(reply, 404, "Assessment not found."); if (session.userId !== user?.id) return fail(reply, 403, "Not permitted.");
    try { return await ReportService.generate(id, force); } catch (error) { return fail(reply, 400, error instanceof Error ? error.message : "Could not generate report."); }
  });
  app.get("/assessments/:id/report", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id;
    const session = await prisma.assessmentSession.findUnique({ where: { id } }); if (!session) return fail(reply, 404, "Assessment not found."); if (session.userId !== user?.id) return fail(reply, 403, "Not permitted.");
    const report = await prisma.readinessReport.findUnique({
      where: { sessionId: id },
      include: {
        recommendations: { include: { subDimension: true }, orderBy: { sortOrder: "asc" } },
        session: {
          include: {
            scoreResult: {
              include: {
                dimensionScores: { include: { dimension: true } },
                subDimensionScores: { include: { subDimension: true } }
              }
            }
          }
        }
      }
    });
    return report ?? fail(reply, 404, "Report has not been generated.");
  });
  app.get("/users/:id/reports", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id; if (id !== user?.id && user?.systemRole === "self") return fail(reply, 403, "Not permitted.");
    return prisma.readinessReport.findMany({ where: { session: { userId: id } }, include: { session: true }, orderBy: { generatedAt: "desc" } });
  });
}
