import "dotenv/config";
import bcrypt from "bcryptjs";
import { StakeholderRole } from "@prisma/client";
import { METHODOLOGY_VERSION, MINIMUM_PEER_RESPONDENTS } from "../src/lib/assessment-methodology.js";
import { PROJECT_HEARMES_SUB_DIMENSIONS, type InstrumentRole } from "../src/lib/instrument.js";
import { prisma } from "../src/lib/prisma.js";
import { ScoringService } from "../src/modules/scoring/service.js";

/**
 * Explicitly synthetic UNC Charlotte records used only to demonstrate the
 * privacy-protected university comparisons. They are deliberately named and
 * isolated by an exact email prefix so they can be removed safely.
 */
export const UNC_CHARLOTTE_INSTITUTION = "University of North Carolina at Charlotte";
export const UNC_CHARLOTTE_DEMO_DEPARTMENT = "HEARMES Demo Data — Do Not Interpret";
export const UNC_CHARLOTTE_DEMO_EMAIL_PREFIX = "demo-comparison.";
const DEMO_EMAIL_DOMAIN = "hearmes.test";
const DEMO_ACCOUNTS_PER_ROLE = MINIMUM_PEER_RESPONDENTS + 1;

const roles: Array<{ role: InstrumentRole; label: string; baseResponses: number[] }> = [
  { role: "student", label: "Student", baseResponses: [3, 2, 3, 2, 3, 2, 3, 3, 2, 3, 3, 3, 3, 2, 4, 3, 3] },
  { role: "faculty", label: "Faculty", baseResponses: [3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 2, 4, 3, 3] },
  { role: "executive_leadership", label: "Executive Leadership", baseResponses: [3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3] },
  { role: "administrative_staff", label: "Administrative Staff", baseResponses: [3, 2, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3] },
  { role: "programming_staff", label: "Programming Staff", baseResponses: [3, 3, 3, 3, 3, 3, 4, 4, 4, 3, 4, 3, 4, 3, 4, 3, 4] },
  { role: "finance_staff", label: "Finance Staff", baseResponses: [3, 3, 3, 3, 3, 2, 3, 3, 4, 3, 3, 3, 3, 2, 3, 3, 3] },
];

function demoEmail(role: InstrumentRole, index: number) {
  return `${UNC_CHARLOTTE_DEMO_EMAIL_PREFIX}${role}.${String(index).padStart(2, "0")}@${DEMO_EMAIL_DOMAIN}`;
}

export const UNC_CHARLOTTE_DEMO_EMAILS = roles.flatMap((profile) =>
  Array.from({ length: DEMO_ACCOUNTS_PER_ROLE }, (_, index) => demoEmail(profile.role, index + 1)),
);

function clampLikert(value: number) {
  return Math.max(1, Math.min(5, value));
}

function profileResponses(base: number[], profileIndex: number) {
  // Small, deterministic variation gives the demo cohort realistic spread
  // while preserving a complete 17-item current-instrument response set.
  const adjustments = [-1, 0, 1, 0, 1, -1];
  return base.map((value, questionIndex) => clampLikert(value + adjustments[(profileIndex + questionIndex * 2) % adjustments.length]));
}

async function completedDemoSetExists() {
  const users = await prisma.user.findMany({
    where: { email: { in: UNC_CHARLOTTE_DEMO_EMAILS } },
    select: {
      email: true,
      sessions: { where: { status: "completed" }, select: { id: true, roleAtTime: true }, take: 1 },
    },
  });
  return users.length === UNC_CHARLOTTE_DEMO_EMAILS.length && users.every((user) => user.sessions.length === 1);
}

/** Removes only the exact, clearly labelled synthetic comparison accounts. */
export async function removeUncCharlotteDemoComparisons() {
  const removed = await prisma.user.deleteMany({ where: { email: { in: UNC_CHARLOTTE_DEMO_EMAILS } } });
  return { removedAccountCount: removed.count };
}

/**
 * Creates six completed synthetic assessments per active stakeholder role.
 * Six, rather than five, ensures even a signed-in synthetic profile has five
 * other results after self-exclusion. Normal users will see at least six peers.
 */
export async function seedUncCharlotteDemoComparisons(mode: "ensure" | "replace" = "ensure") {
  if (mode === "ensure" && await completedDemoSetExists()) {
    return { created: false, accountCount: UNC_CHARLOTTE_DEMO_EMAILS.length, accountsPerRole: DEMO_ACCOUNTS_PER_ROLE };
  }
  if (mode === "replace") await removeUncCharlotteDemoComparisons();

  const institution = await prisma.institution.upsert({
    where: { name: UNC_CHARLOTTE_INSTITUTION },
    update: {},
    create: { name: UNC_CHARLOTTE_INSTITUTION },
  });
  const department = await prisma.department.upsert({
    where: { institutionId_name: { institutionId: institution.id, name: UNC_CHARLOTTE_DEMO_DEPARTMENT } },
    update: {},
    create: { institutionId: institution.id, name: UNC_CHARLOTTE_DEMO_DEPARTMENT },
  });
  const passwordHash = await bcrypt.hash(`not-for-login-${UNC_CHARLOTTE_DEMO_EMAIL_PREFIX}`, 12);

  for (const profile of roles) {
    if (profile.baseResponses.length !== PROJECT_HEARMES_SUB_DIMENSIONS.length) {
      throw new Error(`Invalid response profile for ${profile.role}.`);
    }
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
      throw new Error(`Expected one active current-instrument question per sub-dimension for ${profile.role}; found ${questions.length}. Run the current database seed first.`);
    }

    for (let index = 1; index <= DEMO_ACCOUNTS_PER_ROLE; index += 1) {
      const email = demoEmail(profile.role, index);
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          fullName: `DEMO ONLY — UNC Charlotte ${profile.label} ${String(index).padStart(2, "0")}`,
          passwordHash,
          role: profile.role as StakeholderRole,
          institutionId: institution.id,
          departmentId: department.id,
          unitName: UNC_CHARLOTTE_DEMO_DEPARTMENT,
        },
        create: {
          email,
          fullName: `DEMO ONLY — UNC Charlotte ${profile.label} ${String(index).padStart(2, "0")}`,
          passwordHash,
          role: profile.role as StakeholderRole,
          institutionId: institution.id,
          departmentId: department.id,
          unitName: UNC_CHARLOTTE_DEMO_DEPARTMENT,
          stakeholderRoles: { create: { role: profile.role as StakeholderRole, approvedAt: new Date() } },
        },
      });
      await prisma.userStakeholderRole.upsert({
        where: { userId_role: { userId: user.id, role: profile.role as StakeholderRole } },
        update: { approvedAt: new Date(), verificationPending: false },
        create: { userId: user.id, role: profile.role as StakeholderRole, approvedAt: new Date() },
      });

      // `ensure` can repair a partial deployment without duplicating results.
      await prisma.assessmentSession.deleteMany({ where: { userId: user.id } });
      const values = profileResponses(profile.baseResponses, index - 1);
      const session = await prisma.assessmentSession.create({
        data: {
          userId: user.id,
          roleAtTime: profile.role as StakeholderRole,
          departmentIdAtTime: department.id,
          unitNameAtTime: UNC_CHARLOTTE_DEMO_DEPARTMENT,
          methodologyVersion: METHODOLOGY_VERSION,
          status: "completed",
          completedAt: new Date(),
          responses: {
            create: PROJECT_HEARMES_SUB_DIMENSIONS.map((subDimension, questionIndex) => ({
              questionId: questionBySubDimension.get(subDimension.id)!.id,
              responseValue: values[questionIndex],
            })),
          },
        },
      });
      await ScoringService.scoreSession(session.id);
    }
  }

  console.log(`Created ${UNC_CHARLOTTE_DEMO_EMAILS.length} clearly labelled UNC Charlotte synthetic demo accounts (${DEMO_ACCOUNTS_PER_ROLE} per stakeholder group).`);
  return { created: true, accountCount: UNC_CHARLOTTE_DEMO_EMAILS.length, accountsPerRole: DEMO_ACCOUNTS_PER_ROLE };
}

async function main() {
  const mode = process.env.UNC_CHARLOTTE_DEMO_COMPARISONS_RESET === "true" ? "replace" : "ensure";
  await seedUncCharlotteDemoComparisons(mode);
}

if (process.argv[1]?.endsWith("seed-unc-charlotte-demo-comparisons.ts") || process.argv[1]?.endsWith("seed-unc-charlotte-demo-comparisons.js")) {
  main()
    .catch((error) => {
      console.error("UNC Charlotte demo comparison seed failed:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
