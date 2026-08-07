import "dotenv/config";
import { PrismaClient, StakeholderRole } from "@prisma/client";
import {
  HEAIR_DOCUMENT_ID,
  HEAIR_KNOWLEDGE_CHUNKS,
  HEAIR_SOURCE_CITATION,
  HEAIR_SOURCE_TITLE,
} from "../src/modules/knowledge/heair-framework.js";

const prisma = new PrismaClient();

/* ============================================================
   HEAIR CORE / REAL APPLICATION SEED DATA
   ============================================================

   Everything in this section defines the actual HEAIR structure
   used by the application:

   - HEAIR dimensions
   - HEAIR subdimensions
   - Role-adaptive assessment questions
   - HEAIR framework knowledge document
   - RAG knowledge chunks

   THIS IS NOT MOCK USER DATA.
   ============================================================ */

const dimensions = [
  [
    "governance_strategy",
    "Governance & Strategy",
    "Policies, governance, leadership, and evaluation for AI.",
    1,
  ],
  [
    "systems_infrastructure",
    "Systems & Infrastructure",
    "Secure, capable systems, data, and AI use cases.",
    2,
  ],
  [
    "culture",
    "Culture",
    "Trust, ethics, transparency, and stakeholder engagement.",
    3,
  ],
  [
    "education",
    "Education",
    "AI literacy and expertise development.",
    4,
  ],
] as const;

const subDimensions = [
  [
    "policy_compliance",
    "governance_strategy",
    "Policy & Compliance",
    "Awareness of and adherence to AI policy.",
    1,
  ],
  [
    "ai_governance_access",
    "governance_strategy",
    "AI Governance & Access",
    "Clear, equitable governance and access pathways.",
    2,
  ],
  [
    "leadership_resourcing",
    "governance_strategy",
    "Leadership & Resourcing",
    "Leadership commitment and resources for AI.",
    3,
  ],
  [
    "monitoring_evaluation",
    "governance_strategy",
    "Monitoring & Evaluation",
    "Ongoing monitoring, evaluation, and improvement.",
    4,
  ],
  [
    "infrastructure_privacy_security",
    "systems_infrastructure",
    "Infrastructure, Privacy & Security",
    "Secure, privacy-aware infrastructure.",
    1,
  ],
  [
    "data",
    "systems_infrastructure",
    "Data",
    "Data quality, governance, and access.",
    2,
  ],
  [
    "ai_integration_use_cases",
    "systems_infrastructure",
    "AI Integration & Use Cases",
    "Appropriate and valuable AI implementation.",
    3,
  ],
  [
    "trust_transparency",
    "culture",
    "Trust & Transparency",
    "Trustworthy, understandable AI practices.",
    1,
  ],
  [
    "ethics_responsible_use",
    "culture",
    "Ethics & Responsible Use",
    "Ethical and responsible AI use.",
    2,
  ],
  [
    "stakeholder_engagement_awareness",
    "culture",
    "Stakeholder Engagement & Awareness",
    "Communication and inclusive engagement.",
    3,
  ],
  [
    "ai_literacy",
    "education",
    "AI Literacy",
    "Foundational understanding of AI.",
    1,
  ],
  [
    "expertise_development",
    "education",
    "Expertise Development",
    "Opportunities to develop applied AI expertise.",
    2,
  ],
] as const;

type AssessmentRole =
  | "student"
  | "faculty"
  | "leadership"
  | "business_affairs"
  | "communications";

const defaultLegacyInstitution =
  "University of North Carolina at Charlotte";

/* ============================================================
   REAL HEAIR ROLE-ADAPTIVE ASSESSMENT QUESTIONS
   ============================================================ */

const prompts: Record<AssessmentRole, string[]> = {
  student: [
    "How clearly do you understand your institution’s rules for using AI in coursework, exams, and research?",
    "How confident are you that students have meaningful opportunities to provide input on institutional AI policies?",
    "How adequately does the institution provide students with affordable and accessible AI tools?",
    "How effectively does the institution collect and respond to student feedback about its AI tools and services?",
    "How confident are you that your personal and academic data are protected when using institution-approved AI tools?",
    "How well do you understand what student data AI systems collect and how that data is used?",
    "How effectively can you use AI tools to support learning activities such as tutoring, brainstorming, feedback, or studying?",
    "How confident are you that you can recognize when an AI response may be inaccurate, biased, or misleading?",
    "How well can you use AI without violating academic-integrity, privacy, copyright, or fairness expectations?",
    "How aware are you of opportunities to participate in AI workshops, surveys, discussions, or pilot programs?",
    "How well do you understand how AI works, its limitations, responsible use, and its effects on society?",
    "How available are opportunities for you to develop advanced AI experience through courses, research, internships, hackathons, or projects?",
  ],

  faculty: [
    "How clearly can you translate institutional AI policies into course-level expectations for assignments, assessments, and research?",
    "How meaningfully are faculty involved in developing departmental and institutional AI policies?",
    "How adequate are the funding, time, tools, and personnel available for faculty to experiment with AI?",
    "How effectively do you evaluate whether AI-supported teaching improves learning outcomes without creating inequities?",
    "How confidently can you select and use AI tools that comply with student-data, privacy, accessibility, and security requirements?",
    "How prepared are you to interpret AI-generated student analytics and identify incomplete, inaccurate, or biased data?",
    "How prepared are you to integrate AI into teaching, grading, feedback, research, or course-content development?",
    "How consistently do you explain when AI is being used, what its limitations are, and how it affects students?",
    "How prepared are you to teach students about AI bias, copyright, attribution, privacy, and academic integrity?",
    "How actively do faculty exchange AI practices and concerns through workshops, committees, pilots, or departmental discussions?",
    "How well do you understand AI capabilities, limitations, prompting methods, data concerns, and disciplinary applications?",
    "How accessible are training, research collaborations, conferences, fellowships, and professional-development opportunities related to AI?",
  ],

  leadership: [
    "How comprehensive and current are the institution’s policies governing AI use in academics, research, and operations?",
    "How effectively does the institution include students, faculty, staff, and affected communities in AI-related decisions?",
    "How strongly are AI priorities supported through strategic plans, budgets, staffing, and executive sponsorship?",
    "How effectively does leadership measure AI adoption, educational impact, operational value, trust, fairness, and risk?",
    "How prepared is the institution to identify and respond to security, privacy, legal, and operational risks from AI systems?",
    "How effectively does the institution govern data quality, ownership, access, accuracy, privacy, and responsible reuse?",
    "How clearly has leadership prioritized responsible AI use cases across teaching, research, student services, and administration?",
    "How transparently does leadership communicate which AI systems are used, why they are used, and how they affect stakeholders?",
    "How consistently are fairness, accountability, accessibility, human oversight, and impact reviews included in AI decisions?",
    "How effectively does leadership maintain ongoing dialogue with campus stakeholders about AI plans, concerns, and results?",
    "How effectively does the institution provide AI-literacy education for leaders, faculty, staff, and students?",
    "How effectively does the institution recruit, retain, and develop the expertise required for long-term AI adoption?",
  ],

  business_affairs: [
    "How consistently do AI contracts and procurement processes address legal compliance, licensing, accessibility, privacy, and institutional policy?",
    "How effectively are responsibilities for approving, purchasing, renewing, and overseeing AI products defined?",
    "How effectively does the institution evaluate the total cost, staffing requirements, expected value, and long-term sustainability of AI investments?",
    "How consistently are AI tools evaluated using utilization, cost, service quality, risk, and return-on-investment measures?",
    "How effectively do vendor contracts protect institutional data and address security incidents, data retention, and third-party access?",
    "How reliable and usable are the financial, HR, procurement, facilities, and operational data needed for AI-supported decisions?",
    "How prepared are business units to use AI for activities such as forecasting, scheduling, procurement, HR, finance, and service delivery?",
    "How clearly are employees informed when AI affects administrative workflows, recommendations, evaluations, or decisions?",
    "How consistently are AI vendors and products screened for bias, accessibility, transparency, and responsible-data practices?",
    "How effectively are employees involved in selecting, testing, and improving AI tools that affect their work?",
    "How adequately are business-affairs employees trained to use administrative AI tools safely, accurately, and responsibly?",
    "How prepared is the institution to develop or hire employees with the financial, legal, operational, and technical skills needed for AI adoption?",
  ],

  communications: [
    "How clear are the rules for using AI to create, edit, approve, translate, or distribute institutional communications?",
    "How clearly is the communications team’s role defined in AI policy announcements, crisis communication, and public transparency?",
    "How adequate are the staffing, tools, training, and budget available for responsible AI-assisted communications?",
    "How effectively does the communications team measure the accuracy, reach, accessibility, trust, and audience response of AI-assisted content?",
    "How safely does the communications team handle personal, confidential, or institutional data when using AI tools?",
    "How prepared is the team to verify the quality, consent, ownership, and representativeness of data used for audience targeting or content personalization?",
    "How prepared is the team to use AI for drafting, translation, accessibility, social-media monitoring, chatbots, or crisis response?",
    "How clearly does the institution disclose significant AI use and explain AI-supported messages or decisions to its audiences?",
    "How consistently does the team review AI-generated content for misinformation, bias, harmful stereotypes, copyright issues, and accessibility?",
    "How effectively does the communications team gather feedback and communicate AI changes across campus communities?",
    "How well can communications staff verify AI-generated information, recognize hallucinations, and use AI without weakening institutional credibility?",
    "How available are continuing-development opportunities involving AI communication strategy, verification, accessibility, analytics, and crisis management?",
  ],
};

/* ============================================================
   MOCK / DEMO DATA DEFINITIONS
   ============================================================

   EVERYTHING BELOW THIS COMMENT IS FAKE DATA FOR TESTING.

   These users, assessment scores, reports, recommendations,
   departments, and responses do NOT represent real people or
   real university assessment results.

   This data exists only so dashboards and reports have data
   available during development and demonstrations.
   ============================================================ */

const demoDepartments = [
  "College of Computing and Informatics",
  "College of Business",
  "College of Health and Human Services",
  "Academic Affairs",
  "University Communications",
];

const demoUsers = [
  {
    email: "demo.student@heair.local",
    fullName: "Maya Johnson",
    role: StakeholderRole.student,
    department: "College of Computing and Informatics",
  },
  {
    email: "demo.faculty@heair.local",
    fullName: "Daniel Lee",
    role: StakeholderRole.faculty,
    department: "College of Computing and Informatics",
  },
  {
    email: "demo.leadership@heair.local",
    fullName: "Rachel Thompson",
    role: StakeholderRole.leadership,
    department: "Academic Affairs",
  },
  {
    email: "demo.business@heair.local",
    fullName: "Michael Carter",
    role: StakeholderRole.business_affairs,
    department: "College of Business",
  },
  {
    email: "demo.communications@heair.local",
    fullName: "Sophia Martinez",
    role: StakeholderRole.communications,
    department: "University Communications",
  },
];

/*
   These are intentionally different for each demo user so
   dashboards do not show identical assessment results.
*/

const demoScoreProfiles = [
  {
    governance: 72,
    systems: 64,
    culture: 81,
    education: 86,
  },
  {
    governance: 76,
    systems: 71,
    culture: 78,
    education: 83,
  },
  {
    governance: 88,
    systems: 75,
    culture: 82,
    education: 79,
  },
  {
    governance: 79,
    systems: 73,
    culture: 69,
    education: 72,
  },
  {
    governance: 81,
    systems: 68,
    culture: 87,
    education: 77,
  },
];

/* ============================================================
   MAIN SEED FUNCTION
   ============================================================ */

async function main() {
  console.log("Starting HEAIR database seed...");

  /* ==========================================================
     PART 1 — REAL HEAIR FOUNDATION DATA
     ========================================================== */

  console.log("Seeding HEAIR framework data...");

  const legacyInstitution = await prisma.institution.upsert({
    where: {
      name: defaultLegacyInstitution,
    },
    update: {},
    create: {
      name: defaultLegacyInstitution,
    },
  });

  /*
    Preserve compatibility with older saved users.
  */

  await prisma.user.updateMany({
    where: {
      institutionId: null,
    },
    data: {
      institutionId: legacyInstitution.id,
    },
  });

  await prisma.user.updateMany({
    where: {
      role: null,
    },
    data: {
      role: StakeholderRole.student,
    },
  });

  await prisma.user.updateMany({
    where: {
      role: StakeholderRole.administrator_leadership,
    },
    data: {
      role: StakeholderRole.leadership,
    },
  });

  await prisma.user.updateMany({
    where: {
      role: StakeholderRole.it_staff,
    },
    data: {
      role: StakeholderRole.communications,
    },
  });

  await prisma.user.updateMany({
    where: {
      role: StakeholderRole.academic_business_affairs_staff,
    },
    data: {
      role: StakeholderRole.business_affairs,
    },
  });

  /* ----------------------------------------------------------
     Seed HEAIR Dimensions
     ---------------------------------------------------------- */

  for (const [id, label, description, sortOrder] of dimensions) {
    await prisma.dimension.upsert({
      where: {
        id,
      },
      update: {
        label,
        description,
        sortOrder,
      },
      create: {
        id,
        label,
        description,
        sortOrder,
      },
    });
  }

  /* ----------------------------------------------------------
     Seed HEAIR Subdimensions
     ---------------------------------------------------------- */

  for (
    const [
      id,
      dimensionId,
      label,
      description,
      sortOrder,
    ] of subDimensions
  ) {
    await prisma.subDimension.upsert({
      where: {
        id,
      },
      update: {
        dimensionId,
        label,
        description,
        sortOrder,
      },
      create: {
        id,
        dimensionId,
        label,
        description,
        sortOrder,
      },
    });
  }

  /* ----------------------------------------------------------
     Seed HEAIR Knowledge Document
     ---------------------------------------------------------- */

  await prisma.knowledgeDocument.upsert({
    where: {
      id: HEAIR_DOCUMENT_ID,
    },
    update: {
      sourceTitle: HEAIR_SOURCE_TITLE,
      sourceType: "heair_paper",
      sourceUrlOrCitation: HEAIR_SOURCE_CITATION,
      rawText: HEAIR_KNOWLEDGE_CHUNKS.map(
        (chunk) => chunk.text
      ).join("\n\n"),
    },
    create: {
      id: HEAIR_DOCUMENT_ID,
      sourceTitle: HEAIR_SOURCE_TITLE,
      sourceType: "heair_paper",
      sourceUrlOrCitation: HEAIR_SOURCE_CITATION,
      rawText: HEAIR_KNOWLEDGE_CHUNKS.map(
        (chunk) => chunk.text
      ).join("\n\n"),
    },
  });

  /*
    Rebuild the HEAIR chunks so they remain synchronized with
    the framework source file.
  */

  await prisma.knowledgeChunk.deleteMany({
    where: {
      documentId: HEAIR_DOCUMENT_ID,
    },
  });

  await prisma.knowledgeChunk.createMany({
    data: HEAIR_KNOWLEDGE_CHUNKS.map((chunk) => ({
      documentId: HEAIR_DOCUMENT_ID,
      chunkText: chunk.text,
      chunkIndex: chunk.chunkIndex,
      metadata: chunk.metadata,
    })),
  });

  /* ----------------------------------------------------------
     Seed 60 HEAIR Role-Adaptive Base Questions
     ----------------------------------------------------------

     12 questions × 5 stakeholder roles = 60 questions
     ---------------------------------------------------------- */

  await prisma.question.deleteMany({
    where: {
      sessionScoped: false,
    },
  });

  for (const role of Object.keys(prompts) as AssessmentRole[]) {
    for (let i = 0; i < subDimensions.length; i++) {
      await prisma.question.create({
        data: {
          role: role as StakeholderRole,
          subDimensionId: subDimensions[i][0],
          prompt: prompts[role][i],
          questionType: "likert_5",
          weight: 1,
          isAdaptiveSeed: i === 0 || i === 8,
        },
      });
    }
  }

  console.log(
    "✓ HEAIR taxonomy, questions, and knowledge chunks seeded."
  );

  /* ==========================================================
     PART 2 — MOCK / DEMO DATA
     ==========================================================

     IMPORTANT:
     Everything from this point forward is synthetic test data.

     It exists to populate:
       - dashboard charts
       - assessment history
       - reports
       - recommendations
       - department analytics

     None of these records represent real assessment results.
     ========================================================== */

  console.log("Creating MOCK / DEMO data...");

  /* ----------------------------------------------------------
     DEMO DEPARTMENTS
     ---------------------------------------------------------- */

  const departmentMap = new Map<string, string>();

  for (const name of demoDepartments) {
    const department = await prisma.department.upsert({
      where: {
        institutionId_name: {
          institutionId: legacyInstitution.id,
          name,
        },
      },
      update: {},
      create: {
        institutionId: legacyInstitution.id,
        name,
      },
    });

    departmentMap.set(name, department.id);
  }

  console.log("✓ Demo departments created.");

  /* ----------------------------------------------------------
     REMOVE OLD DEMO ASSESSMENTS BEFORE RE-SEEDING

     This makes the demo portion safe to run multiple times
     without continuously adding duplicate assessment sessions.

     Only users whose email begins with demo.* are affected.
     ---------------------------------------------------------- */

  const existingDemoUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: "demo.",
      },
    },
    select: {
      id: true,
    },
  });

  if (existingDemoUsers.length > 0) {
    await prisma.assessmentSession.deleteMany({
      where: {
        userId: {
          in: existingDemoUsers.map((user) => user.id),
        },
      },
    });
  }

  /*
    Remove old demo department aggregate scores so that they
    can be recreated without violating the compound unique key.
  */

  const demoDepartmentIds = Array.from(departmentMap.values());

  await prisma.departmentAggregateScore.deleteMany({
    where: {
      departmentId: {
        in: demoDepartmentIds,
      },
    },
  });

  /* ----------------------------------------------------------
     DEMO USERS
     ----------------------------------------------------------

     One fake user represents each stakeholder role.

     NOTE:
     MOCK_PASSWORD_HASH is not a real login password hash.
     These accounts are currently intended to populate data,
     not necessarily for authentication.
     ---------------------------------------------------------- */

  const createdDemoUsers = [];

  for (const demoUser of demoUsers) {
    const departmentId = departmentMap.get(
      demoUser.department
    );

    if (!departmentId) {
      throw new Error(
        `Could not find demo department: ${demoUser.department}`
      );
    }

    const user = await prisma.user.upsert({
      where: {
        email: demoUser.email,
      },
      update: {
        fullName: demoUser.fullName,
        role: demoUser.role,
        institutionId: legacyInstitution.id,
        departmentId,
      },
      create: {
        email: demoUser.email,

        /*
          FAKE HASH FOR DEMO DATA ONLY.
          Replace this with the application's actual password
          hashing flow if these accounts need to log in.
        */
        passwordHash: "MOCK_PASSWORD_HASH",

        fullName: demoUser.fullName,
        role: demoUser.role,
        systemRole: "self",
        institutionId: legacyInstitution.id,
        departmentId,
      },
    });

    createdDemoUsers.push(user);
  }

  console.log(
    `✓ ${createdDemoUsers.length} demo users created.`
  );

  /* ----------------------------------------------------------
     GET KNOWLEDGE CHUNKS FOR DEMO RECOMMENDATION CITATIONS
     ---------------------------------------------------------- */

  const knowledgeChunks = await prisma.knowledgeChunk.findMany({
    where: {
      documentId: HEAIR_DOCUMENT_ID,
    },
    orderBy: {
      chunkIndex: "asc",
    },
  });

  /* ----------------------------------------------------------
     DEMO ASSESSMENTS
     ----------------------------------------------------------

     Each demo user receives:
       - one completed assessment session
       - 12 question responses
       - overall score
       - 4 dimension scores
       - 12 subdimension scores
       - readiness report
       - recommendations
     ---------------------------------------------------------- */

  for (let userIndex = 0; userIndex < createdDemoUsers.length; userIndex++) {
    const user = createdDemoUsers[userIndex];
    const scoreProfile = demoScoreProfiles[userIndex];

    if (!scoreProfile) {
      continue;
    }

    /* --------------------------------------------------------
       Calculate Demo Overall Score
       -------------------------------------------------------- */

    const overallScore =
      Math.round(
        ((scoreProfile.governance +
          scoreProfile.systems +
          scoreProfile.culture +
          scoreProfile.education) /
          4) *
          100
      ) / 100;

    /* --------------------------------------------------------
       Create Completed Demo Session
       -------------------------------------------------------- */

    const session = await prisma.assessmentSession.create({
      data: {
        userId: user.id,
        roleAtTime: user.role!,
        departmentIdAtTime: user.departmentId,
        status: "completed",
        startedAt: new Date("2026-07-15T14:00:00Z"),
        completedAt: new Date("2026-07-15T14:15:00Z"),
      },
    });

    /* --------------------------------------------------------
       DEMO QUESTION RESPONSES
       --------------------------------------------------------

       Pull the 12 real HEAIR questions for this user's role.

       Response values are FAKE Likert answers from 1–5.
       -------------------------------------------------------- */

    const userQuestions = await prisma.question.findMany({
      where: {
        role: user.role!,
        sessionScoped: false,
        active: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const fakeLikertResponses = [
      4, 3, 4, 3,
      3, 3, 4, 4,
      4, 5, 4, 5,
    ];

    for (
      let questionIndex = 0;
      questionIndex < userQuestions.length;
      questionIndex++
    ) {
      const question = userQuestions[questionIndex];

      await prisma.questionResponse.create({
        data: {
          sessionId: session.id,
          questionId: question.id,

          /*
            Synthetic Likert response.
          */
          responseValue:
            fakeLikertResponses[
              questionIndex % fakeLikertResponses.length
            ],
        },
      });
    }

    /* --------------------------------------------------------
       DEMO SCORE RESULT
       -------------------------------------------------------- */

    const scoreResult = await prisma.scoreResult.create({
      data: {
        sessionId: session.id,
        overallScore,
      },
    });

    /* --------------------------------------------------------
       DEMO DIMENSION SCORES
       -------------------------------------------------------- */

    await prisma.dimensionScore.createMany({
      data: [
        {
          scoreResultId: scoreResult.id,
          dimensionId: "governance_strategy",
          score: scoreProfile.governance,
        },
        {
          scoreResultId: scoreResult.id,
          dimensionId: "systems_infrastructure",
          score: scoreProfile.systems,
        },
        {
          scoreResultId: scoreResult.id,
          dimensionId: "culture",
          score: scoreProfile.culture,
        },
        {
          scoreResultId: scoreResult.id,
          dimensionId: "education",
          score: scoreProfile.education,
        },
      ],
    });

    /* --------------------------------------------------------
       DEMO SUBDIMENSION SCORES
       --------------------------------------------------------

       Scores are based loosely on the parent dimension score,
       with small variations so dashboard bars do not all look
       identical.
       -------------------------------------------------------- */

    for (
      let subIndex = 0;
      subIndex < subDimensions.length;
      subIndex++
    ) {
      const subDimension = subDimensions[subIndex];

      const subDimensionId = subDimension[0];
      const dimensionId = subDimension[1];

      let parentScore = scoreProfile.governance;

      if (dimensionId === "systems_infrastructure") {
        parentScore = scoreProfile.systems;
      } else if (dimensionId === "culture") {
        parentScore = scoreProfile.culture;
      } else if (dimensionId === "education") {
        parentScore = scoreProfile.education;
      }

      /*
        Adds a small predictable variation:
        -4, -2, 0, +2, +4...
      */

      const variation = ((subIndex % 5) - 2) * 2;

      const fakeSubDimensionScore = Math.min(
        100,
        Math.max(0, parentScore + variation)
      );

      await prisma.subDimensionScore.create({
        data: {
          scoreResultId: scoreResult.id,
          subDimensionId,
          score: fakeSubDimensionScore,

          /*
            Demo assessments contain one base response for
            each subdimension.
          */
          responseCount: 1,
        },
      });
    }

    /* --------------------------------------------------------
       DEMO READINESS REPORT
       -------------------------------------------------------- */

    let readinessLevel = "Emerging";

    if (overallScore >= 80) {
      readinessLevel = "Advanced";
    } else if (overallScore >= 70) {
      readinessLevel = "Developing";
    }

    const report = await prisma.readinessReport.create({
      data: {
        sessionId: session.id,
        overallScore,

        /*
          MOCK GENERATED REPORT TEXT
        */
        summaryText:
          `${user.fullName}'s demo assessment indicates a ${readinessLevel.toLowerCase()} ` +
          `level of AI readiness. The sample results show strengths in selected areas ` +
          `of culture, governance, and AI education while identifying opportunities ` +
          `to strengthen infrastructure, data practices, and institution-wide AI implementation.`,

        structuredData: {
          mockData: true,
          readinessLevel,
          stakeholderRole: user.role,
          strongestDimension: "education",
          priorityDimension: "systems_infrastructure",
        },
      },
    });

    /* --------------------------------------------------------
       DEMO RECOMMENDATIONS
       --------------------------------------------------------

       These recommendations are synthetic examples used
       solely to populate the report interface.
       -------------------------------------------------------- */

    const firstCitation =
      knowledgeChunks.length > 0
        ? [knowledgeChunks[0].id]
        : [];

    const secondCitation =
      knowledgeChunks.length > 1
        ? [knowledgeChunks[1].id]
        : firstCitation;

    const thirdCitation =
      knowledgeChunks.length > 2
        ? [knowledgeChunks[2].id]
        : firstCitation;

    await prisma.recommendation.createMany({
      data: [
        {
          reportId: report.id,
          category: "strength",
          subDimensionId:
            "stakeholder_engagement_awareness",

          title: "Continue stakeholder engagement",

          description:
            "Build on existing engagement by continuing to include students, faculty, staff, and institutional stakeholders in AI-related conversations and planning.",

          supportingCitationIds: firstCitation,
          sortOrder: 1,
        },

        {
          reportId: report.id,
          category: "priority_action",
          subDimensionId:
            "infrastructure_privacy_security",

          title: "Strengthen AI infrastructure planning",

          description:
            "Develop a more formal approach to AI infrastructure, privacy, security, access controls, and institutional system integration.",

          supportingCitationIds: secondCitation,
          sortOrder: 2,
        },

        {
          reportId: report.id,
          category: "resource",
          subDimensionId: "ai_literacy",

          title: "Expand AI literacy development",

          description:
            "Provide role-specific AI literacy and professional-development opportunities that address AI capabilities, limitations, responsible use, and institutional expectations.",

          supportingCitationIds: thirdCitation,
          sortOrder: 3,
        },
      ],
    });

    console.log(
      `✓ Demo assessment created for ${user.fullName}`
    );
  }

  /* ==========================================================
     DEMO DEPARTMENT AGGREGATE DATA
     ==========================================================

     These values are completely synthetic.

     They exist so department-level dashboards and analytics
     can display aggregate readiness information.
     ========================================================== */

  const periodStart = new Date("2026-01-01");
  const periodEnd = new Date("2026-12-31");

  for (let i = 0; i < demoDepartmentIds.length; i++) {
    const departmentId = demoDepartmentIds[i];

    /*
      Small variation by department makes visualizations
      more realistic.
    */

    const adjustment = i * 2;

    await prisma.departmentAggregateScore.createMany({
      data: [
        {
          departmentId,
          dimensionId: "governance_strategy",
          avgScore: Math.min(100, 73 + adjustment),
          sampleSize: 25 + i * 3,
          periodStart,
          periodEnd,
        },

        {
          departmentId,
          dimensionId: "systems_infrastructure",
          avgScore: Math.min(100, 65 + adjustment),
          sampleSize: 25 + i * 3,
          periodStart,
          periodEnd,
        },

        {
          departmentId,
          dimensionId: "culture",
          avgScore: Math.min(100, 78 + adjustment),
          sampleSize: 25 + i * 3,
          periodStart,
          periodEnd,
        },

        {
          departmentId,
          dimensionId: "education",
          avgScore: Math.min(100, 80 + adjustment),
          sampleSize: 25 + i * 3,
          periodStart,
          periodEnd,
        },
      ],
    });
  }

  console.log("✓ Demo department aggregate scores created.");

  /* ==========================================================
     SEED COMPLETE
     ========================================================== */

  console.log("");
  console.log("============================================");
  console.log("HEAIR DATABASE SEED COMPLETE");
  console.log("============================================");
  console.log("");
  console.log("REAL / CORE DATA:");
  console.log("✓ HEAIR dimensions");
  console.log("✓ HEAIR subdimensions");
  console.log("✓ 60 role-adaptive questions");
  console.log("✓ HEAIR knowledge document");
  console.log("✓ HEAIR knowledge chunks");
  console.log("");
  console.log("MOCK / DEMO DATA:");
  console.log(`✓ ${demoDepartments.length} demo departments`);
  console.log(`✓ ${createdDemoUsers.length} demo users`);
  console.log(`✓ ${createdDemoUsers.length} completed assessments`);
  console.log("✓ Demo responses");
  console.log("✓ Demo scores");
  console.log("✓ Demo readiness reports");
  console.log("✓ Demo recommendations");
  console.log("✓ Demo department analytics");
  console.log("");
}

/* ============================================================
   RUN SEED
   ============================================================ */

main()
  .catch((error) => {
    console.error("HEAIR seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });