import { PrismaClient, StakeholderRole } from "@prisma/client";

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

const prompts: Record<StakeholderRole, string[]> = {
  student: [
    "How familiar are you with your institution's AI and academic-integrity policy?", "How clear is it to you who can help with questions about permitted AI use?", "How well does the institution provide resources that support responsible student AI use?", "How often does the institution seek feedback on student experiences with AI guidance?", "How confident are you that institution-approved AI tools protect your privacy and data?", "How clear are the rules for using institutional data or coursework with AI tools?", "How useful are approved AI tools in supporting your learning?", "How much do you trust the institution to explain how AI affects learning decisions?", "How confident are you in recognizing inappropriate or harmful AI use?", "How aware are you of opportunities to share concerns or ideas about AI?", "How well do you understand AI capabilities and limitations relevant to your coursework?", "How available are opportunities to build practical, responsible AI skills?"
  ],
  faculty: [
    "How familiar are you with AI and academic-integrity policies for teaching and assessment?", "How clear are governance processes for faculty adoption of AI tools?", "How adequately are faculty supported with time, funding, and guidance for responsible AI use?", "How consistently are AI-supported teaching practices evaluated and improved?", "How confident are you that approved AI tools meet privacy, security, and accessibility requirements?", "How clear are data governance requirements when using student or course data with AI?", "How effectively are AI tools integrated into pedagogically sound teaching use cases?", "How transparent is the institution about AI tools used in teaching and academic decision-making?", "How prepared are you to apply ethical and responsible AI practices in your courses?", "How meaningfully are faculty involved in institutional AI planning and communication?", "How strong is your AI literacy for evaluating tools and designing learning activities?", "How available is advanced professional development for AI-enabled pedagogy?"
  ],
  administrator_leadership: [
    "How effectively does your area create, maintain, and communicate AI policy and compliance expectations?", "How clear and equitable are institutional AI governance and access decisions?", "How adequately are strategy, budget, and accountable leadership aligned for AI readiness?", "How consistently does leadership monitor AI outcomes, risks, and policy effectiveness?", "How effectively does leadership ensure AI infrastructure meets privacy, security, and accessibility obligations?", "How mature are institutional data governance and stewardship practices for AI?", "How strategically are high-value AI use cases prioritized and governed?", "How transparent is leadership communication about AI decisions and impacts?", "How consistently are ethical and responsible AI principles embedded in decisions?", "How meaningfully are stakeholder groups included in AI strategy and awareness efforts?", "How strong is leadership's shared understanding of AI capabilities, limits, and risks?", "How well does the institution invest in sustained AI expertise development?"
  ],
  it_staff: [
    "How clear are AI policy and compliance requirements for technical implementation?", "How effective are governance pathways for reviewing and provisioning AI tools?", "How adequately are IT teams resourced to deliver and support responsible AI services?", "How consistently are AI systems monitored for performance, security, and outcomes?", "How mature are the privacy, security, integration, and accessibility controls for AI systems?", "How mature are data quality, access control, lineage, and governance practices for AI?", "How effectively are AI use cases integrated with enterprise systems and support workflows?", "How transparent are AI system behavior, limitations, and operational decisions to stakeholders?", "How consistently are responsible-AI safeguards designed into technical delivery?", "How effectively does IT engage stakeholders about AI capabilities, risks, and support?", "How strong is your working knowledge of AI concepts, risks, and tool evaluation?", "How available are advanced learning opportunities for AI architecture and operations?"
  ],
  academic_business_affairs_staff: [
    "How familiar are you with AI policy and compliance expectations for your operational work?", "How clear are the channels for obtaining approval and access to AI tools?", "How adequately are staff supported and resourced to adopt AI responsibly?", "How consistently are AI-enabled processes evaluated for quality, fairness, and improvement?", "How confident are you that approved AI tools protect sensitive institutional and personal information?", "How clear are data handling rules when using AI in business or academic support workflows?", "How useful are AI tools in improving your approved operational use cases?", "How transparent is the institution about AI-assisted processes that affect your work?", "How prepared are you to recognize and respond to ethical AI concerns?", "How meaningfully are staff included in AI communications, training, and feedback processes?", "How well do you understand AI capabilities and limitations relevant to your role?", "How available are opportunities to develop practical AI expertise for your work?"
  ]
};

async function main() {
  for (const [id, label, description, sortOrder] of dimensions) await prisma.dimension.upsert({ where: { id }, update: { label, description, sortOrder }, create: { id, label, description, sortOrder } });
  for (const [id, dimensionId, label, description, sortOrder] of subDimensions) await prisma.subDimension.upsert({ where: { id }, update: { dimensionId, label, description, sortOrder }, create: { id, dimensionId, label, description, sortOrder } });

  await prisma.question.deleteMany({ where: { sessionScoped: false } });
  for (const role of Object.keys(prompts) as StakeholderRole[]) {
    for (let i = 0; i < subDimensions.length; i++) {
      await prisma.question.create({ data: { role, subDimensionId: subDimensions[i][0], prompt: prompts[role][i], questionType: "likert_5", weight: 1, isAdaptiveSeed: i === 0 || i === 8 } });
    }
  }
  console.log("Seeded HEAIR taxonomy and 60 role-adaptive base questions.");
}

main().finally(() => prisma.$disconnect());
