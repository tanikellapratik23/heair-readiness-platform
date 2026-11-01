import "dotenv/config";
import bcrypt from "bcryptjs";
import { RecommendationCategory, StakeholderRole } from "@prisma/client";
import { METHODOLOGY_VERSION } from "../src/lib/assessment-methodology.js";
import { PROJECT_HEARMES_SUB_DIMENSIONS, type InstrumentRole } from "../src/lib/instrument.js";
import { prisma } from "../src/lib/prisma.js";
import { HEAIR_DOCUMENT_ID } from "../src/modules/knowledge/heair-framework.js";
import { ScoringService } from "../src/modules/scoring/service.js";

/**
 * Synthetic accounts for the Coach-output evaluation protocol only. They use a
 * separate institution so they cannot affect UNC Charlotte or other real
 * institutional comparison data.
 */
export const COACH_EVALUATION_INSTITUTION = "Project HEARMES Coach Evaluation (Synthetic)";
const COACH_EVALUATION_DEPARTMENT = "Synthetic Coach Evaluation";
const EMAIL_DOMAIN = "hearmes.test";

const roles: Array<{ role: InstrumentRole; label: string; low: number[]; high: number[] }> = [
  { role: "student", label: "Student", low: [2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 3, 1, 2, 2, 3, 2, 2], high: [4, 4, 4, 4, 4, 3, 5, 4, 4, 4, 5, 3, 4, 4, 5, 4, 4] },
  { role: "faculty", label: "Faculty", low: [2, 2, 1, 2, 2, 2, 3, 2, 2, 3, 3, 1, 2, 2, 3, 1, 2], high: [4, 4, 3, 4, 4, 3, 4, 4, 4, 4, 4, 3, 4, 4, 5, 3, 4] },
  { role: "executive_leadership", label: "Executive Leadership", low: [2, 1, 2, 2, 2, 2, 3, 2, 1, 1, 2, 2, 2, 2, 3, 2, 2], high: [4, 3, 4, 4, 4, 3, 4, 4, 3, 3, 4, 4, 4, 4, 4, 4, 4] },
  { role: "administrative_staff", label: "Administrative Staff", low: [1, 2, 2, 2, 2, 2, 1, 2, 2, 3, 1, 2, 2, 2, 3, 2, 2], high: [4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4] },
  { role: "programming_staff", label: "Programming Staff", low: [2, 2, 2, 2, 1, 2, 2, 2, 2, 1, 3, 2, 2, 2, 3, 2, 2], high: [4, 4, 4, 4, 3, 4, 5, 5, 4, 3, 5, 3, 4, 4, 5, 4, 4] },
  { role: "finance_staff", label: "Finance Staff", low: [2, 1, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 3, 2, 2], high: [4, 3, 3, 4, 4, 3, 4, 4, 3, 4, 4, 3, 4, 4, 4, 4, 4] },
];

function assessmentEmail(role: InstrumentRole, profile: "low" | "high") {
  return `coach-eval.${role}.${profile}@${EMAIL_DOMAIN}`;
}

export const COACH_EVALUATION_EMAILS = roles.flatMap((profile) =>
  (["low", "high"] as const).map((profileKind) => assessmentEmail(profile.role, profileKind)),
);

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function weakSubDimensions(values: number[]) {
  return PROJECT_HEARMES_SUB_DIMENSIONS
    .map((subDimension, index) => ({ subDimension, response: values[index], score: (values[index] - 1) * 25 }))
    .sort((left, right) => left.score - right.score)
    .slice(0, 3);
}

async function replaceEvaluationData(userId: string) {
  // Re-running the command creates a clean, repeatable evaluation set.
  await prisma.chatConversation.deleteMany({ where: { userId } });
  await prisma.coachContextDocument.deleteMany({ where: { userId } });
  await prisma.actionPlanItem.deleteMany({ where: { userId } });
  await prisma.assessmentSession.deleteMany({ where: { userId } });
}

async function createDeterministicReport(sessionId: string, values: number[]) {
  const score = await prisma.scoreResult.findUnique({
    where: { sessionId },
    include: { subDimensionScores: { include: { subDimension: true } } },
  });
  if (!score) throw new Error("Synthetic assessment did not produce a score.");

  const priorities = weakSubDimensions(values);
  await prisma.readinessReport.create({
    data: {
      sessionId,
      overallScore: score.overallScore,
      summaryText: "Synthetic Coach-evaluation assessment. This account exists only to test role- and score-aware AI Coach behavior.",
      structuredData: { isSyntheticCoachEvaluation: true, methodologyVersion: METHODOLOGY_VERSION },
      recommendations: {
        create: priorities.map(({ subDimension }, index) => ({
          category: RecommendationCategory.priority_action,
          subDimensionId: subDimension.id,
          title: `Improve ${subDimension.label}`,
          description: `Synthetic evaluation priority for ${subDimension.label}. Use the AI Coach to explore an appropriate next step for this role.`,
          supportingCitationIds: [HEAIR_DOCUMENT_ID],
          sortOrder: index + 1,
        })),
      },
    },
  });
}

async function completedEvaluationSetExists() {
  const users = await prisma.user.findMany({
    where: { email: { in: COACH_EVALUATION_EMAILS } },
    select: {
      email: true,
      sessions: { where: { status: "completed" }, select: { id: true }, take: 1 },
    },
  });
  return users.length === COACH_EVALUATION_EMAILS.length && users.every((user) => user.sessions.length === 1);
}

/**
 * Creates only the synthetic accounts used by the Coach-output evaluation.
 * In "ensure" mode this is safe to call on each application start: once all
 * twelve accounts have a completed session, it makes no database changes.
 */
export async function seedCoachEvaluationAccounts(
  password: string | undefined,
  mode: "ensure" | "replace" = "replace",
) {
  if (!password || password.length < 12) {
    throw new Error("Set COACH_EVALUATION_PASSWORD to a unique password of at least 12 characters before running this seed.");
  }

  if (mode === "ensure" && await completedEvaluationSetExists()) {
    return { created: false, accountCount: COACH_EVALUATION_EMAILS.length };
  }

  const [questionCount, source] = await Promise.all([
    prisma.question.count({ where: { active: true, sessionScoped: false, subDimensionId: { not: null } } }),
    prisma.knowledgeDocument.findUnique({ where: { id: HEAIR_DOCUMENT_ID }, select: { id: true } }),
  ]);
  if (questionCount < 102 || !source) throw new Error("Run npm run db:seed first so the current instrument and Project HEARMES research source are available.");

  const institution = await prisma.institution.upsert({
    where: { name: COACH_EVALUATION_INSTITUTION },
    update: {},
    create: { name: COACH_EVALUATION_INSTITUTION },
  });
  const department = await prisma.department.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: COACH_EVALUATION_DEPARTMENT } },
    update: {},
    create: { institutionId: institution.id, name: COACH_EVALUATION_DEPARTMENT },
  });
  const passwordHash = await bcrypt.hash(password, 12);

  for (const profile of roles) {
    for (const profileKind of ["low", "high"] as const) {
      const values = profile[profileKind];
      if (values.length !== PROJECT_HEARMES_SUB_DIMENSIONS.length) throw new Error(`Invalid ${profile.role} ${profileKind} profile.`);
      const user = await prisma.user.upsert({
        where: { email: assessmentEmail(profile.role, profileKind) },
        update: {
          fullName: `Coach Evaluation — ${profile.label} (${profileKind} readiness)`,
          passwordHash,
          role: profile.role as StakeholderRole,
          institutionId: institution.id,
          departmentId: department.id,
          unitName: COACH_EVALUATION_DEPARTMENT,
        },
        create: {
          email: assessmentEmail(profile.role, profileKind),
          fullName: `Coach Evaluation — ${profile.label} (${profileKind} readiness)`,
          passwordHash,
          role: profile.role as StakeholderRole,
          institutionId: institution.id,
          departmentId: department.id,
          unitName: COACH_EVALUATION_DEPARTMENT,
          stakeholderRoles: { create: { role: profile.role as StakeholderRole, approvedAt: new Date() } },
        },
      });

      // Prisma nested upsert cannot use the parent ID before it exists. Ensure
      // the role row is present explicitly for both new and existing accounts.
      await prisma.userStakeholderRole.upsert({
        where: { userId_role: { userId: user.id, role: profile.role as StakeholderRole } },
        update: { approvedAt: new Date(), verificationPending: false },
        create: { userId: user.id, role: profile.role as StakeholderRole, approvedAt: new Date() },
      });
      await replaceEvaluationData(user.id);

      const questions = await prisma.question.findMany({
        where: {
          role: profile.role as StakeholderRole,
          active: true,
          sessionScoped: false,
          instrumentKey: { in: PROJECT_HEARMES_SUB_DIMENSIONS.map((subDimension) => `project-hearmes-${profile.role}-${subDimension.id}`) },
        },
        select: { id: true, subDimensionId: true },
      });
      const questionBySubDimension = new Map(questions.map((question) => [question.subDimensionId, question]));
      if (questions.length !== PROJECT_HEARMES_SUB_DIMENSIONS.length || questionBySubDimension.size !== PROJECT_HEARMES_SUB_DIMENSIONS.length) {
        throw new Error(`Expected exactly one active current-instrument question per sub-dimension for ${profile.role}; found ${questions.length}.`);
      }

      const session = await prisma.assessmentSession.create({
        data: {
          userId: user.id,
          roleAtTime: profile.role as StakeholderRole,
          departmentIdAtTime: department.id,
          unitNameAtTime: COACH_EVALUATION_DEPARTMENT,
          methodologyVersion: METHODOLOGY_VERSION,
          status: "completed",
          completedAt: new Date(),
          responses: {
            create: PROJECT_HEARMES_SUB_DIMENSIONS.map((subDimension, index) => ({
              questionId: questionBySubDimension.get(subDimension.id)!.id,
              responseValue: values[index],
            })),
          },
        },
      });
      await ScoringService.scoreSession(session.id);
      await createDeterministicReport(session.id, values);
    }
  }

  const profileSummary = roles.flatMap((profile) => (["low", "high"] as const).map((profileKind) => ({
    role: profile.role,
    profile: profileKind,
    email: assessmentEmail(profile.role, profileKind),
    approximateReadinessScore: Math.round(average(profile[profileKind].map((value) => (value - 1) * 25)) * 10) / 10,
  })));
  console.table(profileSummary);
  console.log("Created 12 isolated synthetic Coach-evaluation accounts. A replacement run changes only their synthetic sessions, reports, conversations, private context, and action-plan data.");
  return { created: true, accountCount: profileSummary.length };
}

async function main() {
  await seedCoachEvaluationAccounts(process.env.COACH_EVALUATION_PASSWORD, "replace");
}

// The same implementation is also imported by the server for the free-Render
// one-time setup path. Only execute it when this file is run as a command.
if (process.argv[1]?.endsWith("seed-coach-evaluation.ts") || process.argv[1]?.endsWith("seed-coach-evaluation.js")) {
  main()
    .catch((error) => {
      console.error("Coach-evaluation seed failed:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
