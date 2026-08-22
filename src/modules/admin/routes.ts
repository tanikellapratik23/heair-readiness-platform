import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SystemRole } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const completedAssessment = { status: "completed" as const, scoreResult: { isNot: null } };
const activeRoles = ["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"] as const;
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
const exportQuery = z.object({ institution_id: z.string().uuid().optional() });

async function administrator(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = await currentUser(request);
    if (!user || user.systemRole !== SystemRole.admin) {
      fail(reply, 403, "Administrator access is required.");
      return null;
    }
    return user;
  } catch {
    fail(reply, 401, "Sign in as an administrator to view this dashboard.");
    return null;
  }
}

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
    if (!await administrator(request, reply)) return;

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

    const roleScores = new Map(activeRoles.map((role) => [role, [] as number[]]));
    const institutionCounts = new Map<string, { respondentCount: number; completedAssessmentCount: number }>();
    for (const respondent of respondents) {
      const latest = respondent.sessions[0];
      const role = respondent.role ?? latest?.roleAtTime;
      const score = latest?.scoreResult ? Number(latest.scoreResult.overallScore) : null;
      if (role && roleScores.has(role as (typeof activeRoles)[number]) && score !== null) roleScores.get(role as (typeof activeRoles)[number])?.push(score);
      if (respondent.institution) {
        const current = institutionCounts.get(respondent.institution.id) ?? { respondentCount: 0, completedAssessmentCount: 0 };
        current.respondentCount += 1;
        current.completedAssessmentCount += respondent._count.sessions;
        institutionCounts.set(respondent.institution.id, current);
      }
    }

    return {
      summary: {
        institutionCount: institutions.length,
        respondentCount: respondents.length,
        completedAssessmentCount: [...institutionCounts.values()].reduce((sum, institution) => sum + institution.completedAssessmentCount, 0),
        stakeholderGroups: activeRoles.map((role) => {
          const scores = roleScores.get(role) ?? [];
          return { role, respondentCount: scores.length, averageLatestScore: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null };
        })
      },
      institutions: institutions.map((institution) => ({ id: institution.id, name: institution.name, ...(institutionCounts.get(institution.id) ?? { respondentCount: 0, completedAssessmentCount: 0 }) }))
    };
  });

  app.get("/admin/stakeholders/:role", async (request, reply) => {
    if (!await administrator(request, reply)) return;
    const role = (request.params as { role: string }).role;
    if (!activeRoles.includes(role as (typeof activeRoles)[number])) return fail(reply, 404, "Stakeholder group not found.");
    const respondents = await prisma.user.findMany({
      where: { sessions: { some: { ...completedAssessment, roleAtTime: role as (typeof activeRoles)[number] } } },
      orderBy: [{ institution: { name: "asc" } }, { email: "asc" }],
      select: {
        fullName: true,
        email: true,
        institution: { select: { name: true } },
        sessions: { where: { ...completedAssessment, roleAtTime: role as (typeof activeRoles)[number] }, orderBy: { completedAt: "desc" }, take: 1, select: { completedAt: true, scoreResult: { select: { overallScore: true } } } },
        _count: { select: { sessions: { where: { ...completedAssessment, roleAtTime: role as (typeof activeRoles)[number] } } } }
      }
    });
    return {
      role,
      people: respondents.map((person) => ({
        fullName: person.fullName,
        email: person.email,
        institutionName: person.institution?.name ?? "Institution not set",
        latestScore: person.sessions[0]?.scoreResult ? Number(person.sessions[0].scoreResult.overallScore) : null,
        latestAssessmentAt: person.sessions[0]?.completedAt ?? null,
        assessmentCount: person._count.sessions
      }))
    };
  });

  app.get("/admin/export.csv", async (request, reply) => {
    if (!await administrator(request, reply)) return;
    const query = exportQuery.safeParse(request.query);
    if (!query.success) return fail(reply, 400, "Choose a valid university for this export.");

    const sessions = await prisma.assessmentSession.findMany({
      where: { ...completedAssessment, ...(query.data.institution_id ? { user: { institutionId: query.data.institution_id } } : {}) },
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
