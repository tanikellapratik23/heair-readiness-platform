import { PrismaClient, StakeholderRole } from "@prisma/client";
import { HEAIR_DOCUMENT_ID, HEAIR_KNOWLEDGE_CHUNKS, HEAIR_SOURCE_CITATION, HEAIR_SOURCE_TITLE } from "../src/modules/knowledge/heair-framework.js";

const prisma = new PrismaClient();

const dimensions = [
  ["governance_strategy", "Governance & Strategy", "Policies, governance, leadership, and evaluation for AI.", 1],
  ["systems_infrastructure", "Systems & Infrastructure", "Secure, capable systems, data, and AI use cases.", 2],
  ["culture", "Culture", "Trust, ethics, transparency, and stakeholder engagement.", 3],
  ["education", "Education", "AI literacy and expertise development.", 4],
] as const;

const subDimensions = [
  ["policy_compliance", "governance_strategy", "Policy & Compliance", "Awareness of and adherence to AI policy.", 1],
  ["ai_governance_access", "governance_strategy", "AI Governance & Access", "Clear, equitable governance and access pathways.", 2],
  ["leadership_resourcing", "governance_strategy", "Leadership & Resourcing", "Leadership commitment and resources for AI.", 3],
  ["monitoring_evaluation", "governance_strategy", "Monitoring & Evaluation", "Ongoing monitoring, evaluation, and improvement.", 4],
  ["infrastructure_privacy_security", "systems_infrastructure", "Infrastructure, Privacy & Security", "Secure, privacy-aware infrastructure.", 1],
  ["data", "systems_infrastructure", "Data", "Data quality, governance, and access.", 2],
  ["ai_integration_use_cases", "systems_infrastructure", "AI Integration & Use Cases", "Appropriate and valuable AI implementation.", 3],
  ["trust_transparency", "culture", "Trust & Transparency", "Trustworthy, understandable AI practices.", 1],
  ["ethics_responsible_use", "culture", "Ethics & Responsible Use", "Ethical and responsible AI use.", 2],
  ["stakeholder_engagement_awareness", "culture", "Stakeholder Engagement & Awareness", "Communication and inclusive engagement.", 3],
  ["ai_literacy", "education", "AI Literacy", "Foundational understanding of AI.", 1],
  ["expertise_development", "education", "Expertise Development", "Opportunities to develop applied AI expertise.", 2],
] as const;

type AssessmentRole = "student" | "faculty" | "leadership" | "business_affairs" | "communications";

const prompts: Record<AssessmentRole, string[]> = {
  student: [
    "How clearly do you understand your institution’s rules for using AI in coursework, exams, and research?", "How confident are you that students have meaningful opportunities to provide input on institutional AI policies?", "How adequately does the institution provide students with affordable and accessible AI tools?", "How effectively does the institution collect and respond to student feedback about its AI tools and services?", "How confident are you that your personal and academic data are protected when using institution-approved AI tools?", "How well do you understand what student data AI systems collect and how that data is used?", "How effectively can you use AI tools to support learning activities such as tutoring, brainstorming, feedback, or studying?", "How confident are you that you can recognize when an AI response may be inaccurate, biased, or misleading?", "How well can you use AI without violating academic-integrity, privacy, copyright, or fairness expectations?", "How aware are you of opportunities to participate in AI workshops, surveys, discussions, or pilot programs?", "How well do you understand how AI works, its limitations, responsible use, and its effects on society?", "How available are opportunities for you to develop advanced AI experience through courses, research, internships, hackathons, or projects?"
  ],
  faculty: [
    "How clearly can you translate institutional AI policies into course-level expectations for assignments, assessments, and research?", "How meaningfully are faculty involved in developing departmental and institutional AI policies?", "How adequate are the funding, time, tools, and personnel available for faculty to experiment with AI?", "How effectively do you evaluate whether AI-supported teaching improves learning outcomes without creating inequities?", "How confidently can you select and use AI tools that comply with student-data, privacy, accessibility, and security requirements?", "How prepared are you to interpret AI-generated student analytics and identify incomplete, inaccurate, or biased data?", "How prepared are you to integrate AI into teaching, grading, feedback, research, or course-content development?", "How consistently do you explain when AI is being used, what its limitations are, and how it affects students?", "How prepared are you to teach students about AI bias, copyright, attribution, privacy, and academic integrity?", "How actively do faculty exchange AI practices and concerns through workshops, committees, pilots, or departmental discussions?", "How well do you understand AI capabilities, limitations, prompting methods, data concerns, and disciplinary applications?", "How accessible are training, research collaborations, conferences, fellowships, and professional-development opportunities related to AI?"
  ],
  leadership: [
    "How comprehensive and current are the institution’s policies governing AI use in academics, research, and operations?", "How effectively does the institution include students, faculty, staff, and affected communities in AI-related decisions?", "How strongly are AI priorities supported through strategic plans, budgets, staffing, and executive sponsorship?", "How effectively does leadership measure AI adoption, educational impact, operational value, trust, fairness, and risk?", "How prepared is the institution to identify and respond to security, privacy, legal, and operational risks from AI systems?", "How effectively does the institution govern data quality, ownership, access, accuracy, privacy, and responsible reuse?", "How clearly has leadership prioritized responsible AI use cases across teaching, research, student services, and administration?", "How transparently does leadership communicate which AI systems are used, why they are used, and how they affect stakeholders?", "How consistently are fairness, accountability, accessibility, human oversight, and impact reviews included in AI decisions?", "How effectively does leadership maintain ongoing dialogue with campus stakeholders about AI plans, concerns, and results?", "How effectively does the institution provide AI-literacy education for leaders, faculty, staff, and students?", "How effectively does the institution recruit, retain, and develop the expertise required for long-term AI adoption?"
  ],
  business_affairs: [
    "How consistently do AI contracts and procurement processes address legal compliance, licensing, accessibility, privacy, and institutional policy?", "How effectively are responsibilities for approving, purchasing, renewing, and overseeing AI products defined?", "How effectively does the institution evaluate the total cost, staffing requirements, expected value, and long-term sustainability of AI investments?", "How consistently are AI tools evaluated using utilization, cost, service quality, risk, and return-on-investment measures?", "How effectively do vendor contracts protect institutional data and address security incidents, data retention, and third-party access?", "How reliable and usable are the financial, HR, procurement, facilities, and operational data needed for AI-supported decisions?", "How prepared are business units to use AI for activities such as forecasting, scheduling, procurement, HR, finance, and service delivery?", "How clearly are employees informed when AI affects administrative workflows, recommendations, evaluations, or decisions?", "How consistently are AI vendors and products screened for bias, accessibility, transparency, and responsible-data practices?", "How effectively are employees involved in selecting, testing, and improving AI tools that affect their work?", "How adequately are business-affairs employees trained to use administrative AI tools safely, accurately, and responsibly?", "How prepared is the institution to develop or hire employees with the financial, legal, operational, and technical skills needed for AI adoption?"
  ],
  communications: [
    "How clear are the rules for using AI to create, edit, approve, translate, or distribute institutional communications?", "How clearly is the communications team’s role defined in AI policy announcements, crisis communication, and public transparency?", "How adequate are the staffing, tools, training, and budget available for responsible AI-assisted communications?", "How effectively does the communications team measure the accuracy, reach, accessibility, trust, and audience response of AI-assisted content?", "How safely does the communications team handle personal, confidential, or institutional data when using AI tools?", "How prepared is the team to verify the quality, consent, ownership, and representativeness of data used for audience targeting or content personalization?", "How prepared is the team to use AI for drafting, translation, accessibility, social-media monitoring, chatbots, or crisis response?", "How clearly does the institution disclose significant AI use and explain AI-supported messages or decisions to its audiences?", "How consistently does the team review AI-generated content for misinformation, bias, harmful stereotypes, copyright issues, and accessibility?", "How effectively does the communications team gather feedback and communicate AI changes across campus communities?", "How well can communications staff verify AI-generated information, recognize hallucinations, and use AI without weakening institutional credibility?", "How available are continuing-development opportunities involving AI communication strategy, verification, accessibility, analytics, and crisis management?"
  ]
};

async function main() {
  for (const [id, label, description, sortOrder] of dimensions) await prisma.dimension.upsert({ where: { id }, update: { label, description, sortOrder }, create: { id, label, description, sortOrder } });
  for (const [id, dimensionId, label, description, sortOrder] of subDimensions) await prisma.subDimension.upsert({ where: { id }, update: { dimensionId, label, description, sortOrder }, create: { id, dimensionId, label, description, sortOrder } });

  await prisma.knowledgeDocument.upsert({
    where: { id: HEAIR_DOCUMENT_ID },
    update: { sourceTitle: HEAIR_SOURCE_TITLE, sourceType: "heair_paper", sourceUrlOrCitation: HEAIR_SOURCE_CITATION, rawText: HEAIR_KNOWLEDGE_CHUNKS.map((chunk) => chunk.text).join("\n\n") },
    create: { id: HEAIR_DOCUMENT_ID, sourceTitle: HEAIR_SOURCE_TITLE, sourceType: "heair_paper", sourceUrlOrCitation: HEAIR_SOURCE_CITATION, rawText: HEAIR_KNOWLEDGE_CHUNKS.map((chunk) => chunk.text).join("\n\n") }
  });
  await prisma.knowledgeChunk.deleteMany({ where: { documentId: HEAIR_DOCUMENT_ID } });
  await prisma.knowledgeChunk.createMany({ data: HEAIR_KNOWLEDGE_CHUNKS.map((chunk) => ({ documentId: HEAIR_DOCUMENT_ID, chunkText: chunk.text, chunkIndex: chunk.chunkIndex, metadata: chunk.metadata })) });

  await prisma.question.deleteMany({ where: { sessionScoped: false } });
  for (const role of Object.keys(prompts) as AssessmentRole[]) {
    for (let i = 0; i < subDimensions.length; i++) {
      await prisma.question.create({ data: { role: role as StakeholderRole, subDimensionId: subDimensions[i][0], prompt: prompts[role][i], questionType: "likert_5", weight: 1, isAdaptiveSeed: i === 0 || i === 8 } });
    }
  }
  console.log("Seeded HEAIR taxonomy, 60 role-adaptive base questions, and source-grounded HEAIR retrieval chunks.");
}

main().finally(() => prisma.$disconnect());
