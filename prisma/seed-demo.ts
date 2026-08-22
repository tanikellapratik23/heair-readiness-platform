import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient, StakeholderRole } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_INSTITUTION_NAME = "HEAIR Demonstration University";
const DEMO_DEPARTMENT_NAME = "HEAIR Demonstration Program";
const DEMO_EMAIL_PREFIX = "demo.heair.";

const legacyDemoEmails = [
  "demo.student@heair.local",
  "demo.faculty@heair.local",
  "demo.leadership@heair.local",
  "demo.business@heair.local",
  "demo.it-staff@heair.local",
];

const subDimensionIds = [
  "policy_compliance",
  "ai_governance_access",
  "leadership_resourcing",
  "monitoring_evaluation",
  "infrastructure_privacy_security",
  "data",
  "ai_integration_use_cases",
  "trust_transparency",
  "ethics_responsible_use",
  "stakeholder_engagement_awareness",
  "ai_literacy",
  "expertise_development",
];

const dimensionGroups = [
  { id: "governance_strategy", start: 0, end: 4 },
  { id: "systems_infrastructure", start: 4, end: 7 },
  { id: "culture", start: 7, end: 10 },
  { id: "education", start: 10, end: 12 },
];

type DemoRoleProfiles = {
  role: StakeholderRole;
  label: string;
  profiles: number[][];
};

// Five synthetic profiles for each of the six current stakeholder roles.
// These scores are for product demonstrations and automated testing only.
const demoProfiles: DemoRoleProfiles[] = [
  {
    role: StakeholderRole.student,
    label: "Student",
    profiles: [
      [50, 45, 40, 45, 50, 45, 55, 55, 65, 55, 65, 60],
      [60, 55, 45, 50, 55, 55, 60, 65, 65, 60, 70, 65],
      [45, 50, 45, 40, 50, 50, 55, 50, 60, 55, 60, 55],
      [55, 50, 50, 55, 60, 55, 65, 60, 65, 65, 70, 70],
      [50, 55, 45, 50, 55, 50, 60, 55, 60, 60, 65, 60],
    ],
  },
  {
    role: StakeholderRole.faculty,
    label: "Faculty",
    profiles: [
      [65, 65, 60, 60, 70, 65, 70, 70, 75, 70, 80, 75],
      [70, 65, 65, 70, 75, 70, 75, 70, 80, 75, 80, 80],
      [60, 60, 55, 60, 65, 60, 70, 65, 75, 70, 75, 70],
      [70, 70, 65, 65, 70, 70, 75, 75, 75, 75, 85, 80],
      [65, 60, 60, 65, 70, 65, 70, 70, 70, 70, 80, 75],
    ],
  },
  {
    role: StakeholderRole.executive_leadership,
    label: "Executive Leadership",
    profiles: [
      [75, 70, 75, 70, 65, 65, 70, 70, 75, 75, 70, 75],
      [80, 75, 80, 75, 70, 70, 75, 75, 80, 75, 75, 80],
      [70, 70, 65, 70, 65, 60, 70, 70, 70, 75, 70, 70],
      [75, 75, 70, 75, 70, 70, 75, 75, 75, 80, 75, 75],
      [80, 70, 75, 70, 70, 65, 70, 75, 80, 75, 70, 80],
    ],
  },
  {
    role: StakeholderRole.administrative_staff,
    label: "Administrative Staff",
    profiles: [
      [65, 65, 70, 65, 65, 70, 65, 60, 65, 60, 65, 70],
      [70, 70, 75, 70, 70, 70, 70, 65, 70, 65, 70, 75],
      [60, 65, 65, 60, 65, 65, 60, 60, 65, 65, 60, 65],
      [70, 65, 70, 65, 70, 75, 70, 65, 70, 70, 70, 70],
      [65, 70, 65, 70, 65, 70, 65, 65, 65, 65, 70, 65],
    ],
  },
  {
    role: StakeholderRole.programming_staff,
    label: "Programming Staff",
    profiles: [
      [60, 65, 60, 65, 65, 60, 70, 70, 70, 75, 75, 70],
      [65, 70, 65, 70, 70, 65, 75, 75, 75, 80, 80, 75],
      [60, 60, 55, 60, 60, 60, 65, 65, 70, 70, 70, 65],
      [70, 65, 65, 70, 70, 65, 75, 75, 75, 75, 80, 75],
      [65, 65, 60, 65, 65, 65, 70, 70, 70, 75, 75, 70],
    ],
  },
  {
    role: StakeholderRole.finance_staff,
    label: "Finance Staff",
    profiles: [
      [65, 65, 70, 65, 65, 70, 65, 60, 65, 60, 65, 70],
      [70, 70, 75, 70, 70, 70, 70, 65, 70, 65, 70, 75],
      [60, 65, 65, 60, 65, 65, 60, 60, 65, 65, 60, 65],
      [70, 65, 70, 65, 70, 75, 70, 65, 70, 70, 70, 70],
      [65, 70, 65, 70, 65, 70, 65, 65, 65, 65, 70, 65],
    ],
  },
];

function average(values: number[]) {
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100;
}

async function main() {
  console.log("Writing 30 synthetic HEAIR demonstration assessments.");
  console.log("This script is for demos and tests only. Do not run it against production data.");

  const [dimensionCount, subDimensionCount] = await Promise.all([
    prisma.dimension.count(),
    prisma.subDimension.count(),
  ]);

  if (dimensionCount !== 4 || subDimensionCount !== 12) {
    throw new Error("Run npm run db:seed before npm run db:seed:demo so the HEAIR taxonomy exists.");
  }

  const institution = await prisma.institution.upsert({
    where: { name: DEMO_INSTITUTION_NAME },
    update: {},
    create: { name: DEMO_INSTITUTION_NAME },
  });

  const department = await prisma.department.upsert({
    where: {
      institutionId_name: {
        institutionId: institution.id,
        name: DEMO_DEPARTMENT_NAME,
      },
    },
    update: {},
    create: {
      institutionId: institution.id,
      name: DEMO_DEPARTMENT_NAME,
    },
  });

  const previousDemoUsers = await prisma.user.findMany({
    where: {
      OR: [
        { institutionId: institution.id, email: { startsWith: DEMO_EMAIL_PREFIX } },
        { email: { in: legacyDemoEmails } },
      ],
    },
    select: { id: true },
  });

  if (previousDemoUsers.length > 0) {
    await prisma.assessmentSession.deleteMany({
      where: { userId: { in: previousDemoUsers.map((user) => user.id) } },
    });
  }

  const demoPasswordHash = await hash(randomUUID(), 12);
  let assessmentCount = 0;

  for (const roleProfile of demoProfiles) {
    for (const [index, subDimensionScores] of roleProfile.profiles.entries()) {
      const suffix = String(index + 1).padStart(2, "0");
      const email = DEMO_EMAIL_PREFIX + roleProfile.role + "." + suffix + "@heair.demo";
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          fullName: "HEAIR Demo " + roleProfile.label + " " + suffix,
          role: roleProfile.role,
          systemRole: "self",
          institutionId: institution.id,
          departmentId: department.id,
          passwordHash: demoPasswordHash,
        },
        create: {
          email,
          fullName: "HEAIR Demo " + roleProfile.label + " " + suffix,
          role: roleProfile.role,
          systemRole: "self",
          institutionId: institution.id,
          departmentId: department.id,
          passwordHash: demoPasswordHash,
        },
      });

      const dimensionScores = dimensionGroups.map((dimension) => ({
        dimensionId: dimension.id,
        score: average(subDimensionScores.slice(dimension.start, dimension.end)),
      }));
      const overallScore = average(dimensionScores.map((score) => score.score));
      const completedAt = new Date(Date.UTC(2026, 6, 1 + assessmentCount, 12, 0, 0));

      await prisma.assessmentSession.create({
        data: {
          userId: user.id,
          roleAtTime: roleProfile.role,
          departmentIdAtTime: department.id,
          status: "completed",
          startedAt: new Date(completedAt.getTime() - 15 * 60 * 1000),
          completedAt,
          scoreResult: {
            create: {
              overallScore,
              dimensionScores: { create: dimensionScores },
              subDimensionScores: {
                create: subDimensionIds.map((subDimensionId, scoreIndex) => ({
                  subDimensionId,
                  score: subDimensionScores[scoreIndex],
                  responseCount: 1,
                })),
              },
            },
          },
          report: {
            create: {
              overallScore,
              summaryText: "Synthetic HEAIR demonstration assessment for testing dashboard and comparison views.",
              structuredData: {
                isDemoData: true,
                stakeholderRole: roleProfile.role,
                purpose: "development_and_demonstration",
              },
            },
          },
        },
      });

      assessmentCount += 1;
    }
  }

  const allProfiles = demoProfiles.flatMap((roleProfile) => roleProfile.profiles);
  const periodStart = new Date("2026-01-01T00:00:00.000Z");
  const periodEnd = new Date("2026-12-31T00:00:00.000Z");
  await prisma.departmentAggregateScore.deleteMany({ where: { departmentId: department.id } });
  await prisma.departmentAggregateScore.createMany({
    data: dimensionGroups.map((dimension) => ({
      departmentId: department.id,
      dimensionId: dimension.id,
      avgScore: average(allProfiles.map((profile) => average(profile.slice(dimension.start, dimension.end)))),
      sampleSize: assessmentCount,
      periodStart,
      periodEnd,
    })),
  });

  console.log("Created " + assessmentCount + " synthetic completed assessments: five for each stakeholder role.");
}

main()
  .catch((error) => {
    console.error("HEAIR demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
