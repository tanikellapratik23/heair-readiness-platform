import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { SystemRole } from "@prisma/client";
import { z } from "zod";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { PROJECT_HEARMES_SUB_DIMENSIONS } from "../../lib/instrument.js";

const completedAssessment = { status: "completed" as const, scoreResult: { isNot: null } };
const activeRoles = ["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"] as const;
const dimensionColumns = [
  ["governance_strategy", "governance_strategy_score"],
  ["systems_infrastructure", "systems_infrastructure_score"],
  ["culture", "culture_score"],
  ["education", "education_score"]
] as const;
const subDimensionColumns = PROJECT_HEARMES_SUB_DIMENSIONS.map((item) => [item.id, `${item.id}_score`] as const);
const exportQuery = z.object({ institution_id: z.string().uuid().optional() });
const institutionQuery = z.object({ institution_id: z.string().uuid().optional() });

function roundedAverage(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

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

    const [institutions, respondents, completedSessions] = await Promise.all([
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
      }),
      prisma.assessmentSession.findMany({ where: { ...completedAssessment, roleAtTime: { in: [...activeRoles] } }, orderBy: { completedAt: "desc" }, select: { userId: true, roleAtTime: true, scoreResult: { select: { overallScore: true } } } })
    ]);

    const roleScores = new Map(activeRoles.map((role) => [role, [] as number[]]));
    const latestByRoleAndPerson = new Map<string, (typeof completedSessions)[number]>();
    for (const session of completedSessions) {
      const key = `${session.userId}:${session.roleAtTime}`;
      if (!latestByRoleAndPerson.has(key)) latestByRoleAndPerson.set(key, session);
    }
    for (const session of latestByRoleAndPerson.values()) {
      const score = session.scoreResult ? Number(session.scoreResult.overallScore) : null;
      if (score !== null && Number.isFinite(score)) roleScores.get(session.roleAtTime as (typeof activeRoles)[number])?.push(score);
    }
    const institutionCounts = new Map<string, { respondentCount: number; completedAssessmentCount: number }>();
    for (const respondent of respondents) {
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
    const query = institutionQuery.safeParse(request.query);
    if (!query.success) return fail(reply, 400, "Choose a valid institution.");
    const respondents = await prisma.user.findMany({
      where: {
        ...(query.data.institution_id ? { institutionId: query.data.institution_id } : {}),
        sessions: { some: { ...completedAssessment, roleAtTime: role as (typeof activeRoles)[number] } }
      },
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
      institutionId: query.data.institution_id ?? null,
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

  /**
   * A privacy-conscious institutional readiness summary. It deliberately uses
   * only the latest completed result for each person and returns aggregates,
   * never respondent-level data.
   */
  app.get("/admin/institutions/:institutionId/readiness-report", async (request, reply) => {
    if (!await administrator(request, reply)) return;
    const institutionId = (request.params as { institutionId: string }).institutionId;
    if (!z.string().uuid().safeParse(institutionId).success) return fail(reply, 400, "Choose a valid institution.");

    const [institution, sessions] = await Promise.all([
      prisma.institution.findUnique({ where: { id: institutionId }, select: { id: true, name: true } }),
      prisma.assessmentSession.findMany({
        where: { ...completedAssessment, user: { institutionId } },
        orderBy: { completedAt: "desc" },
        select: {
          userId: true,
          roleAtTime: true,
          completedAt: true,
          scoreResult: {
            select: {
              overallScore: true,
              dimensionScores: { select: { score: true, dimension: { select: { id: true, label: true, sortOrder: true } } } },
              subDimensionScores: { select: { score: true, subDimension: { select: { id: true, label: true, sortOrder: true, dimension: { select: { label: true, sortOrder: true } } } } } }
            }
          }
        }
      })
    ]);
    if (!institution) return fail(reply, 404, "Institution not found.");

    const latestByPerson = new Map<string, (typeof sessions)[number]>();
    for (const session of sessions) if (!latestByPerson.has(session.userId)) latestByPerson.set(session.userId, session);
    const latest = [...latestByPerson.values()].filter((session) => session.scoreResult);
    const dimensions = new Map<string, { label: string; sortOrder: number; scores: number[] }>();
    const subDimensions = new Map<string, { label: string; dimension: string; dimensionOrder: number; sortOrder: number; scores: number[] }>();
    const roles = new Map<string, number[]>();
    for (const session of latest) {
      const result = session.scoreResult!;
      const roleScores = roles.get(session.roleAtTime) ?? [];
      roleScores.push(Number(result.overallScore));
      roles.set(session.roleAtTime, roleScores);
      for (const item of result.dimensionScores) {
        const entry = dimensions.get(item.dimension.id) ?? { label: item.dimension.label, sortOrder: item.dimension.sortOrder, scores: [] };
        entry.scores.push(Number(item.score));
        dimensions.set(item.dimension.id, entry);
      }
      for (const item of result.subDimensionScores) {
        const entry = subDimensions.get(item.subDimension.id) ?? {
          label: item.subDimension.label,
          dimension: item.subDimension.dimension.label,
          dimensionOrder: item.subDimension.dimension.sortOrder,
          sortOrder: item.subDimension.sortOrder,
          scores: []
        };
        entry.scores.push(Number(item.score));
        subDimensions.set(item.subDimension.id, entry);
      }
    }

    return {
      institution,
      generatedAt: new Date().toISOString(),
      basis: "Latest completed assessment for each account",
      participantCount: latest.length,
      completedAssessmentCount: sessions.length,
      overallAverage: roundedAverage(latest.map((session) => Number(session.scoreResult!.overallScore))),
      dimensions: [...dimensions.entries()]
        .map(([id, item]) => ({ id, label: item.label, averageScore: roundedAverage(item.scores), respondentCount: item.scores.length, sortOrder: item.sortOrder }))
        .sort((left, right) => left.sortOrder - right.sortOrder),
      focusAreas: [...subDimensions.entries()]
        .map(([id, item]) => ({ id, label: item.label, dimension: item.dimension, averageScore: roundedAverage(item.scores), respondentCount: item.scores.length, dimensionOrder: item.dimensionOrder, sortOrder: item.sortOrder }))
        .sort((left, right) => (left.averageScore ?? 101) - (right.averageScore ?? 101) || left.dimensionOrder - right.dimensionOrder || left.sortOrder - right.sortOrder)
        .slice(0, 3),
      stakeholderGroups: activeRoles.map((role) => {
        const scores = roles.get(role) ?? [];
        return { role, participantCount: scores.length, averageScore: roundedAverage(scores) };
      })
    };
  });

  app.get("/admin/export.csv", async (request, reply) => {
    const admin = await administrator(request, reply); if (!admin) return;
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
        .sort((left, right) => (left.question.subDimension?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.question.subDimension?.sortOrder ?? Number.MAX_SAFE_INTEGER))
        .map((response) => ({
          subDimension: response.question.subDimension?.label ?? "AI use and training metadata",
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
    await prisma.exportAuditLog.create({ data: { userId: admin.id, exportType: "administrator_assessment_csv", scope: { institutionId: query.data.institution_id ?? null, completedAssessmentCount: sessions.length, includesIndividualData: true } } });
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="project-hearmes-assessment-export.csv"')
      .send(csv);
  });
}
