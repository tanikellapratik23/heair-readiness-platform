import type { FastifyInstance } from "fastify";
import { SystemRole } from "@prisma/client";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const completedAssessment = { status: "completed" as const, scoreResult: { isNot: null } };
const activeRoles = ["student", "faculty", "leadership", "business_affairs", "communications"] as const;
const dimensionColumns = [
  ["governance_strategy", "governance_strategy_score"],
  ["systems_infrastructure", "systems_infrastructure_score"],
  ["culture", "culture_score"],
  ["education", "education_score"]
] as const;
const subDimensionColumns = [
  ["policy_compliance", "policy_compliance_score"],
  ["ai_governance_access", "ai_governance_access_score"],
  ["leadership_resourcing", "leadership_resourcing_score"],
  ["monitoring_evaluation", "monitoring_evaluation_score"],
  ["infrastructure_privacy_security", "infrastructure_privacy_security_score"],
  ["data", "data_score"],
  ["ai_integration_use_cases", "ai_integration_use_cases_score"],
  ["trust_transparency", "trust_transparency_score"],
  ["ethics_responsible_use", "ethics_responsible_use_score"],
  ["stakeholder_engagement_awareness", "stakeholder_engagement_awareness_score"],
  ["ai_literacy", "ai_literacy_score"],
  ["expertise_development", "expertise_development_score"]
] as const;

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  // Prevent a spreadsheet app from interpreting participant-supplied values as formulas.
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

/**
 * Restricted administrator views for the research platform. All routes require
 * the server-side administrator role and never expose password hashes.
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

    const roleCounts = new Map(activeRoles.map((role) => [role, 0]));
    for (const people of peopleByInstitution.values()) {
      for (const person of people) {
        if (person.role && roleCounts.has(person.role as (typeof activeRoles)[number])) {
          roleCounts.set(person.role as (typeof activeRoles)[number], (roleCounts.get(person.role as (typeof activeRoles)[number]) ?? 0) + 1);
        }
      }
    }

    return {
      summary: {
        institutionCount: rows.length,
        respondentCount: respondents.length,
        completedAssessmentCount: rows.reduce((sum, institution) => sum + institution.completedAssessmentCount, 0),
        stakeholderGroups: activeRoles.map((role) => ({ role, respondentCount: roleCounts.get(role) ?? 0 }))
      },
      institutions: rows
    };
  });

  app.get("/admin/export.csv", async (request, reply) => {
    let user;
    try {
      user = await currentUser(request);
    } catch {
      return fail(reply, 401, "Sign in as an administrator to export assessment data.");
    }
    if (!user || user.systemRole !== SystemRole.admin) return fail(reply, 403, "Administrator access is required.");

    const sessions = await prisma.assessmentSession.findMany({
      where: completedAssessment,
      orderBy: [{ user: { institution: { name: "asc" } } }, { completedAt: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            institution: { select: { name: true } },
            department: { select: { name: true } }
          }
        },
        scoreResult: {
          include: {
            dimensionScores: { include: { dimension: { select: { id: true } } } },
            subDimensionScores: { include: { subDimension: { select: { id: true } } } }
          }
        },
        responses: {
          include: {
            question: { select: { prompt: true, subDimension: { select: { label: true, sortOrder: true } } } }
          }
        },
        report: { select: { summaryText: true } }
      }
    });

    const headers = [
      "institution",
      "department",
      "participant_id",
      "full_name",
      "email",
      "stakeholder_role",
      "assessment_id",
      "completed_at",
      "overall_score",
      ...dimensionColumns.map(([, column]) => column),
      ...subDimensionColumns.map(([, column]) => column),
      "responses_json",
      "report_summary"
    ];
    const rows = sessions.map((session) => {
      const result = session.scoreResult!;
      const dimensionScores = new Map(result.dimensionScores.map((score) => [score.dimension.id, Number(score.score)]));
      const subDimensionScores = new Map(result.subDimensionScores.map((score) => [score.subDimension.id, Number(score.score)]));
      const responseData = session.responses
        .sort((left, right) => left.question.subDimension.sortOrder - right.question.subDimension.sortOrder)
        .map((response) => ({
          subDimension: response.question.subDimension.label,
          question: response.question.prompt,
          response: response.responseValue
        }));
      return [
        session.user.institution?.name,
        session.user.department?.name,
        session.user.id,
        session.user.fullName,
        session.user.email,
        session.roleAtTime,
        session.id,
        session.completedAt?.toISOString(),
        Number(result.overallScore),
        ...dimensionColumns.map(([id]) => dimensionScores.get(id)),
        ...subDimensionColumns.map(([id]) => subDimensionScores.get(id)),
        JSON.stringify(responseData),
        session.report?.summaryText
      ].map(csvCell).join(",");
    });

    const csv = [headers.map(csvCell).join(","), ...rows].join("\n");
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="heair-assessment-export.csv"')
      .send(csv);
  });
}
