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
  ["stakeholder_engagement_awareness", "culture", "Stakeholder Engagement & Awareness", "Inclusive engagement and awareness.", 3],
  ["ai_literacy", "education", "AI Literacy", "Foundational understanding of AI.", 1],
  ["expertise_development", "education", "Expertise Development", "Opportunities to develop applied AI expertise.", 2],
] as const;

type AssessmentRole = "student" | "faculty" | "leadership" | "business_affairs" | "it_staff";
const defaultLegacyInstitution = "University of North Carolina at Charlotte";

const prompts: Record<AssessmentRole, string[]> = {
  student: [
    "How familiar are you with all AI policies that apply to you at your institution?", "During your time at your institution, how aware are you of AI policies and changes to those policies?", "How comfortable are you advocating on AI-related topics to your institutional leadership?", "How often do you have the opportunity to evaluate or report problems with institutional AI systems?", "When using AI tools for school-related tasks, how concerned are you with the privacy and security of your data?", "How confident are you that your personal and academic data are appropriately managed and protected when using institutional AI tools?", "To what extent has the integration of AI improved your academic workflows and supported your coursework?", "How confident are you that AI technologies used by your institution are implemented transparently and are trustworthy?", "How confident are you in your ability to recognize what is acceptable AI use and prohibited AI use within your institution?", "How often are students involved in institutional discussions or decisions about AI policy or AI use?", "How would you rate your understanding of how AI tools work and their limits?", "What opportunities has your institution provided to help you develop practical AI skills for academic or professional use?"
  ],
  faculty: [
    "Using your personal self-assessment, how similar are your practices to your institution’s AI policies and goals?", "How aware are you of changes to your institution's AI policies that affect your instruction and coursework?", "How involved are you in working with institutional leadership to govern AI usage?", "To what extent do you know the impact of AI systems on your classroom outcomes?", "How concerned are you with the privacy and security of your data when using AI tools for teaching and curriculum-related tasks?", "How effectively does your institution manage the quality, privacy, and security of data used in AI-supported teaching or research?", "To what extent has the integration of AI improved your teaching, research, and course-preparation workflows?", "How transparent is your institution about how AI is used in teaching, learning, and academic decision-making?", "How concerned are you about the ethical implications of AI use in teaching and coursework?", "How involved do you feel in institutional conversations or decisions about AI use?", "On a scale of 1 to 5, how prepared do you feel to use AI tools and understand their uses and limitations?", "What professional-development opportunities are available to help you develop advanced AI skills for teaching, research, or academic work?"
  ],
  leadership: [
    "How often does your institution update its AI policies to align with accreditation standards?", "How confident are you that your institution's AI policies are reviewed and updated to keep up with changes in AI technology and institutional needs?", "How important do you think it is to direct limited institutional resources toward AI projects?", "How often do you offer opportunities for stakeholders to provide feedback on institutional AI initiatives?", "How confident are you that your institution's data privacy and security infrastructure can appropriately support the adoption of AI?", "How effectively does your institution manage the quality, privacy, security, and governance of data used by AI systems?", "To what extent has AI integration improved the efficiency and effectiveness of institutional processes within your area?", "How does your institution ensure transparency and build trust when implementing AI technologies?", "How well do you believe your institution's AI policies address the ethical concerns associated with AI use?", "How effective is your institution's communication of its AI strategy to faculty, staff, and students?", "To what extent do the staff you supervise demonstrate gaps in AI literacy?", "How effectively does your institution support the development of advanced AI knowledge and skills among faculty, staff, and leadership?"
  ],
  business_affairs: [
    "How confident are you that your department has the bandwidth to keep up with changing AI policy and contracts?", "How clear are your institution's AI policies for managing sensitive student data?", "To the best of your knowledge, how would you rate the outcomes of your institution’s investment in AI compared with the cost?", "How often do you review the effectiveness of AI within your institution and its different departments?", "How confident are you that you know which AI tools are approved for use involving sensitive information such as financial or student data?", "How confident are you that data used by AI systems within your department are accurate, secure, and appropriately managed?", "To what extent has the integration of AI improved the efficiency and effectiveness of your department's day-to-day workflows?", "How well does your institution communicate how AI systems are used to support administrative decisions and services?", "How confident are you in identifying ethical uses of AI when handling student data?", "How involved is your division with the deployment, planning, or implementation of your institution's AI strategy?", "How would you rate your overall understanding of AI and its abilities?", "What training or professional-development opportunities are available to help you develop AI skills relevant to your role?"
  ],
  it_staff: [
    "How prepared do you feel to handle the technical oversight of AI tools in your institution?", "How confident are you that your institution has an effective process for updating and reviewing AI policies as technology and risks change?", "How involved are you in communicating with leadership regarding institutional needs related to AI?", "Based on your knowledge, how able is your institution to immediately respond to emergencies or failures within AI systems?", "How confident are you that security weaknesses in AI tools are identified and addressed effectively?", "How effectively does your institution maintain data quality, security, and responsible data management for AI applications?", "To what extent is your institution's technical infrastructure capable of effectively supporting integrated AI tools and workflows?", "How are AI system decisions, limitations, and updates communicated to users across the institution?", "How concerned are you about the ethical and institutional risks involving AI tools used across your campus?", "How involved are you in decisions about AI implementation, infrastructure, security, data, and technology support?", "How confident are you in your understanding of the AI tools you support?", "What opportunities are available to help you develop advanced AI knowledge and technical skills relevant to your role?"
  ]
};

async function main() {
  const legacyInstitution = await prisma.institution.upsert({ where: { name: defaultLegacyInstitution }, update: {}, create: { name: defaultLegacyInstitution } });
  await prisma.user.updateMany({ where: { institutionId: null }, data: { institutionId: legacyInstitution.id } });
  await prisma.user.updateMany({ where: { role: null }, data: { role: StakeholderRole.student } });
  await prisma.user.updateMany({ where: { role: StakeholderRole.administrator_leadership }, data: { role: StakeholderRole.leadership } });
  await prisma.user.updateMany({ where: { role: StakeholderRole.communications }, data: { role: StakeholderRole.it_staff } });
  await prisma.user.updateMany({ where: { role: StakeholderRole.academic_business_affairs_staff }, data: { role: StakeholderRole.business_affairs } });

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
