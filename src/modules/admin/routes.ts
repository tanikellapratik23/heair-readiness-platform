import type { FastifyInstance } from "fastify";
import { SystemRole } from "@prisma/client";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const completedAssessment = { status: "completed" as const, scoreResult: { isNot: null } };

/**
 * Restricted administrator view. It exposes only the metadata needed to manage
 * the research platform, never assessment responses, report text, or passwords.
 */
export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/overview", async (request, reply) => {
    let user;
    try {
      user = await currentUser(request);
    } catch {
      return fail(reply, 401, "Sign in as an administrator to view this dashboard.");
    }
    if (!user || user.systemRole !== SystemRole.admin) return fail(reply, 403, "Administrator access is required.");

    const [institutions, respondents] = await Promise.all([
      prisma.institution.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.user.findMany({
        where: { sessions: { some: completedAssessment } },
        orderBy: [{ institution: { name: "asc" } }, { email: "asc" }],
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          institution: { select: { id: true, name: true } },
          sessions: {
            where: completedAssessment,
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { completedAt: true, roleAtTime: true, scoreResult: { select: { overallScore: true } } }
          },
          _count: { select: { sessions: { where: completedAssessment } } }
        }
      })
    ]);

    const peopleByInstitution = new Map<string, Array<{
      id: string;
      fullName: string | null;
      email: string;
      role: string | null;
      assessmentCount: number;
      latestScore: number | null;
      latestAssessmentAt: Date | null;
    }>>();

    for (const respondent of respondents) {
      if (!respondent.institution) continue;
      const latest = respondent.sessions[0];
      const person = {
        id: respondent.id,
        fullName: respondent.fullName,
        email: respondent.email,
        role: respondent.role ?? latest?.roleAtTime ?? null,
        assessmentCount: respondent._count.sessions,
        latestScore: latest?.scoreResult ? Number(latest.scoreResult.overallScore) : null,
        latestAssessmentAt: latest?.completedAt ?? null
      };
      peopleByInstitution.set(respondent.institution.id, [...(peopleByInstitution.get(respondent.institution.id) ?? []), person]);
    }

    const rows = institutions.map((institution) => {
      const people = peopleByInstitution.get(institution.id) ?? [];
      return {
        id: institution.id,
        name: institution.name,
        respondentCount: people.length,
        completedAssessmentCount: people.reduce((sum, person) => sum + person.assessmentCount, 0),
        people
      };
    });

    return {
      summary: {
        institutionCount: rows.length,
        respondentCount: respondents.length,
        completedAssessmentCount: rows.reduce((sum, institution) => sum + institution.completedAssessmentCount, 0)
      },
      institutions: rows
    };
  });
}
