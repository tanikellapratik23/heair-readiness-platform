/**
 * Project HEARMES draft instrument (2026).
 *
 * This is the single source of truth for the role-adaptive assessment.  Each
 * question is intentionally paired with the metric type specified in the
 * research draft, rather than treating every prompt as generic agreement.
 */
export type MetricType = "awareness" | "frequency" | "ability_confidence" | "likelihood" | "importance" | "agreement";
export type InstrumentRole = "student" | "faculty" | "executive_leadership" | "administrative_staff" | "programming_staff" | "finance_staff";

export const PROJECT_HEARMES_DIMENSIONS = [
  { id: "governance_strategy", label: "Governance & Strategy", description: "Policies, risk management, governance, leadership, and improvement processes for AI.", sortOrder: 1 },
  { id: "systems_infrastructure", label: "Systems & Infrastructure", description: "Secure, reliable systems, governed data, equitable access, and AI-enabled workflows.", sortOrder: 2 },
  { id: "culture", label: "Culture", description: "Trust, responsible use, and stakeholder engagement around AI.", sortOrder: 3 },
  { id: "education", label: "Education", description: "AI literacy, AI-enhanced learning, and expertise development.", sortOrder: 4 }
] as const;

export const PROJECT_HEARMES_SUB_DIMENSIONS = [
  { id: "policy_compliance", dimensionId: "governance_strategy", label: "Policy & Compliance", description: "Clear, role-relevant AI policy and compliance guidance.", sortOrder: 1 },
  { id: "ai_risk_incident_response", dimensionId: "governance_strategy", label: "AI Risk Management & Incident Response", description: "Ability to identify, report, and respond to AI risks and incidents.", sortOrder: 2 },
  { id: "ai_governance_access", dimensionId: "governance_strategy", label: "AI Governance & Access", description: "Inclusive AI governance and appropriate access pathways.", sortOrder: 3 },
  { id: "adaptive_ai_policy_processes", dimensionId: "governance_strategy", label: "Adaptive AI Policy Processes", description: "Policy processes that evolve with technology, evidence, and stakeholder feedback.", sortOrder: 4 },
  { id: "leadership_resourcing", dimensionId: "governance_strategy", label: "Leadership & Resourcing", description: "Leadership commitment and sustained resources for responsible AI.", sortOrder: 5 },
  { id: "ai_performance_monitoring", dimensionId: "governance_strategy", label: "AI Performance Monitoring & Optimization", description: "Regular evaluation and improvement of AI outcomes.", sortOrder: 6 },
  { id: "infrastructure_privacy_security", dimensionId: "systems_infrastructure", label: "Infrastructure, Privacy & Security", description: "Secure, privacy-aware technical foundations for AI.", sortOrder: 1 },
  { id: "ai_system_reliability_maintenance", dimensionId: "systems_infrastructure", label: "AI System Reliability & Maintenance", description: "Reliable operation, maintenance, and support of AI systems.", sortOrder: 2 },
  { id: "data_governance_management", dimensionId: "systems_infrastructure", label: "Data Governance & Management", description: "High-quality, governed, and responsibly managed data for AI.", sortOrder: 3 },
  { id: "equitable_ai_access", dimensionId: "systems_infrastructure", label: "Equitable AI Access", description: "Fair, accessible access to approved AI tools and support.", sortOrder: 4 },
  { id: "ai_workflow_integration", dimensionId: "systems_infrastructure", label: "AI Workflow Integration", description: "Appropriate integration of AI into work, learning, and service workflows.", sortOrder: 5 },
  { id: "trust_transparency", dimensionId: "culture", label: "Trust & Transparency", description: "Clear explanations of how, why, and where AI is used.", sortOrder: 1 },
  { id: "ethics_responsible_use", dimensionId: "culture", label: "Ethics & Responsible Use", description: "Ethical, fair, accountable, and responsible AI practice.", sortOrder: 2 },
  { id: "stakeholder_engagement_awareness", dimensionId: "culture", label: "Stakeholder Engagement & Awareness", description: "Meaningful awareness, participation, and feedback across stakeholders.", sortOrder: 3 },
  { id: "ai_literacy", dimensionId: "education", label: "AI Literacy", description: "Understanding of AI capabilities, limits, and appropriate use.", sortOrder: 1 },
  { id: "ai_enhanced_teaching_curriculum", dimensionId: "education", label: "AI-Enhanced Teaching & Curriculum Development", description: "Thoughtful use of AI in learning, teaching, curriculum, and training design.", sortOrder: 2 },
  { id: "expertise_development", dimensionId: "education", label: "Expertise Development", description: "Opportunities to build role-relevant applied AI expertise.", sortOrder: 3 }
] as const;

export const METRIC_SCALES: Record<MetricType, readonly string[]> = {
  awareness: ["Not aware", "Slightly aware", "Somewhat aware", "Very aware", "Fully aware"],
  frequency: ["Never", "Rarely", "Sometimes", "Often", "Consistently"],
  ability_confidence: ["Not at all confident", "Slightly confident", "Moderately confident", "Very confident", "Extremely confident"],
  likelihood: ["Very unlikely", "Unlikely", "Neither likely nor unlikely", "Likely", "Very likely"],
  importance: ["Not important", "Slightly important", "Moderately important", "Very important", "Extremely important"],
  agreement: ["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"]
};

type PromptRow = { subDimensionId: (typeof PROJECT_HEARMES_SUB_DIMENSIONS)[number]["id"]; metricType: MetricType; prompt: string; helpText?: string };
const rows = (entries: PromptRow[]) => entries;

export const PROJECT_HEARMES_QUESTION_ROWS: Record<InstrumentRole, PromptRow[]> = {
  student: rows([
    { subDimensionId: "policy_compliance", metricType: "awareness", prompt: "How aware are you of the AI and academic-integrity policies that apply to your coursework?" },
    { subDimensionId: "ai_risk_incident_response", metricType: "ability_confidence", prompt: "How confident are you that you know where to report a harmful, inaccurate, or inappropriate use of AI at your institution?" },
    { subDimensionId: "ai_governance_access", metricType: "agreement", prompt: "Students like me have a meaningful way to raise concerns or contribute ideas about institutional AI decisions." },
    { subDimensionId: "adaptive_ai_policy_processes", metricType: "awareness", prompt: "How aware are you when AI guidance for students is updated or clarified?" },
    { subDimensionId: "leadership_resourcing", metricType: "agreement", prompt: "My institution provides enough support for students to use approved AI tools responsibly." },
    { subDimensionId: "ai_performance_monitoring", metricType: "frequency", prompt: "How often are students asked for feedback about the AI tools or AI-supported services they use?" },
    { subDimensionId: "infrastructure_privacy_security", metricType: "ability_confidence", prompt: "How confident are you that you can protect your personal and academic information when using AI for school-related work?" },
    { subDimensionId: "ai_system_reliability_maintenance", metricType: "agreement", prompt: "When an institution-provided AI tool has a problem, students can get timely help or clear updates." },
    { subDimensionId: "data_governance_management", metricType: "awareness", prompt: "How aware are you of how your student data may be used by institution-provided AI tools?" },
    { subDimensionId: "equitable_ai_access", metricType: "agreement", prompt: "Students have equitable access to approved AI tools and the support needed to use them." },
    { subDimensionId: "ai_workflow_integration", metricType: "agreement", prompt: "Approved AI tools help support my learning or academic workflow in useful ways." },
    { subDimensionId: "trust_transparency", metricType: "agreement", prompt: "My institution clearly explains how, why, and where AI technologies are used in student-facing settings." },
    { subDimensionId: "ethics_responsible_use", metricType: "ability_confidence", prompt: "How confident are you in recognizing responsible and prohibited AI use in your coursework?" },
    { subDimensionId: "stakeholder_engagement_awareness", metricType: "frequency", prompt: "How often do you hear about opportunities for students to discuss or learn about institutional AI use?" },
    { subDimensionId: "ai_literacy", metricType: "ability_confidence", prompt: "How confident are you in understanding what AI tools can do, what they cannot do, and when to question an output?" },
    { subDimensionId: "ai_enhanced_teaching_curriculum", metricType: "agreement", prompt: "Based on your experience, AI is considered thoughtfully when courses or learning activities are developed." },
    { subDimensionId: "expertise_development", metricType: "agreement", prompt: "My institution offers practical opportunities to build AI skills relevant to my studies or career goals." }
  ]),
  faculty: rows([
    { subDimensionId: "policy_compliance", metricType: "awareness", prompt: "How aware are you of the AI policies and guidance that affect your teaching, research, and course design?" },
    { subDimensionId: "ai_risk_incident_response", metricType: "ability_confidence", prompt: "How confident are you that you know how to report an AI-related risk, error, or concern affecting teaching or learning?" },
    { subDimensionId: "ai_governance_access", metricType: "agreement", prompt: "Faculty have meaningful opportunities to participate in institutional AI governance and access decisions." },
    { subDimensionId: "adaptive_ai_policy_processes", metricType: "agreement", prompt: "AI guidance for teaching and learning is updated as technology, evidence, and classroom needs change." },
    { subDimensionId: "leadership_resourcing", metricType: "agreement", prompt: "Institutional leadership provides adequate resources for faculty to adopt AI responsibly in teaching and research." },
    { subDimensionId: "ai_performance_monitoring", metricType: "frequency", prompt: "How often does your department review whether AI-supported teaching practices are improving learning or creating concerns?" },
    { subDimensionId: "infrastructure_privacy_security", metricType: "ability_confidence", prompt: "How confident are you that approved AI tools protect course, research, and student information appropriately?" },
    { subDimensionId: "ai_system_reliability_maintenance", metricType: "agreement", prompt: "Reliable support is available when AI tools used for instruction or research fail or change unexpectedly." },
    { subDimensionId: "data_governance_management", metricType: "agreement", prompt: "Data used in AI-supported teaching or research are managed with clear quality, privacy, and governance practices." },
    { subDimensionId: "equitable_ai_access", metricType: "agreement", prompt: "Faculty and students can access approved AI tools and accommodations equitably." },
    { subDimensionId: "ai_workflow_integration", metricType: "agreement", prompt: "Approved AI tools are integrated into teaching, research, or course-preparation workflows in ways that add value." },
    { subDimensionId: "trust_transparency", metricType: "agreement", prompt: "The institution communicates transparently about AI use in teaching, learning, and academic decision-making." },
    { subDimensionId: "ethics_responsible_use", metricType: "ability_confidence", prompt: "How confident are you in identifying ethical, fair, and responsible AI use in your academic work?" },
    { subDimensionId: "stakeholder_engagement_awareness", metricType: "frequency", prompt: "How often are faculty invited to share feedback or participate in conversations about institutional AI use?" },
    { subDimensionId: "ai_literacy", metricType: "ability_confidence", prompt: "How confident are you in explaining AI capabilities, limitations, and appropriate use to students or colleagues?" },
    { subDimensionId: "ai_enhanced_teaching_curriculum", metricType: "agreement", prompt: "Within your department, AI is considered thoughtfully when courses, learning activities, or curriculum are developed." },
    { subDimensionId: "expertise_development", metricType: "agreement", prompt: "The institution offers role-relevant professional development for faculty to build applied AI expertise." }
  ]),
  executive_leadership: rows([
    { subDimensionId: "policy_compliance", metricType: "frequency", prompt: "How often are institutional AI policies reviewed for compliance with applicable legal, accreditation, and institutional requirements?" },
    { subDimensionId: "ai_risk_incident_response", metricType: "agreement", prompt: "The institution has clear ownership and escalation processes for AI risks, incidents, and harms." },
    { subDimensionId: "ai_governance_access", metricType: "agreement", prompt: "AI governance includes appropriate representation from the stakeholders affected by institutional AI decisions." },
    { subDimensionId: "adaptive_ai_policy_processes", metricType: "agreement", prompt: "The institution can adapt its AI policies in response to technology changes, evidence, and stakeholder feedback." },
    { subDimensionId: "leadership_resourcing", metricType: "agreement", prompt: "Leadership allocates sustained resources for responsible AI adoption, oversight, and capability development." },
    { subDimensionId: "ai_performance_monitoring", metricType: "frequency", prompt: "How often are institutional AI initiatives evaluated for outcomes, equity, cost, risk, and improvement opportunities?" },
    { subDimensionId: "infrastructure_privacy_security", metricType: "agreement", prompt: "The institution has privacy, security, and infrastructure controls appropriate for its AI use cases." },
    { subDimensionId: "ai_system_reliability_maintenance", metricType: "agreement", prompt: "The institution has clear accountability for maintaining reliable AI systems and communicating outages or changes." },
    { subDimensionId: "data_governance_management", metricType: "agreement", prompt: "Institutional data used by AI systems have appropriate governance, quality assurance, access controls, and stewardship." },
    { subDimensionId: "equitable_ai_access", metricType: "agreement", prompt: "Institutional AI access decisions consider affordability, accessibility, and equity across stakeholder groups." },
    { subDimensionId: "ai_workflow_integration", metricType: "agreement", prompt: "AI initiatives are integrated into institutional workflows with clear value, accountability, and change-management plans." },
    { subDimensionId: "trust_transparency", metricType: "agreement", prompt: "The institution clearly communicates how, why, and where AI is used in decisions and services that affect people." },
    { subDimensionId: "ethics_responsible_use", metricType: "agreement", prompt: "Institutional AI policies and practices meaningfully address fairness, accountability, accessibility, and potential harms." },
    { subDimensionId: "stakeholder_engagement_awareness", metricType: "agreement", prompt: "The institution communicates its AI strategy and engages faculty, staff, and students in meaningful ways." },
    { subDimensionId: "ai_literacy", metricType: "agreement", prompt: "Leaders and the people they support have the AI literacy needed to make informed institutional decisions." },
    { subDimensionId: "ai_enhanced_teaching_curriculum", metricType: "agreement", prompt: "Institutional AI strategy supports thoughtful AI-enhanced teaching, learning, and curriculum development." },
    { subDimensionId: "expertise_development", metricType: "agreement", prompt: "The institution provides sustained pathways for faculty, staff, and leaders to develop role-relevant AI expertise." }
  ]),
  administrative_staff: rows([
    { subDimensionId: "policy_compliance", metricType: "awareness", prompt: "How aware are you of the AI policies and approval requirements that apply to administrative work in your unit?" },
    { subDimensionId: "ai_risk_incident_response", metricType: "ability_confidence", prompt: "How confident are you that you know how to report an AI-related error, privacy concern, or harmful outcome in your work?" },
    { subDimensionId: "ai_governance_access", metricType: "agreement", prompt: "Administrative staff have a clear way to ask questions or contribute feedback about institutional AI decisions." },
    { subDimensionId: "adaptive_ai_policy_processes", metricType: "awareness", prompt: "How aware are you when AI guidance, vendor requirements, or approval processes change for your unit?" },
    { subDimensionId: "leadership_resourcing", metricType: "agreement", prompt: "My unit has adequate time, training, and support to adopt approved AI tools responsibly." },
    { subDimensionId: "ai_performance_monitoring", metricType: "frequency", prompt: "How often does your unit review whether AI-enabled processes are accurate, helpful, and appropriate?" },
    { subDimensionId: "infrastructure_privacy_security", metricType: "ability_confidence", prompt: "How confident are you that you know which AI tools are approved for sensitive student, employee, or operational information?" },
    { subDimensionId: "ai_system_reliability_maintenance", metricType: "agreement", prompt: "My unit receives clear support and communication when an approved AI tool has problems or changes." },
    { subDimensionId: "data_governance_management", metricType: "agreement", prompt: "Data used by AI in my unit are handled with clear quality, privacy, security, and approval practices." },
    { subDimensionId: "equitable_ai_access", metricType: "agreement", prompt: "Staff in my unit can access approved AI tools and support equitably." },
    { subDimensionId: "ai_workflow_integration", metricType: "agreement", prompt: "Approved AI tools are integrated into my unit's workflows in ways that improve service or efficiency." },
    { subDimensionId: "trust_transparency", metricType: "agreement", prompt: "My institution explains how AI is used in administrative decisions and services that affect people." },
    { subDimensionId: "ethics_responsible_use", metricType: "ability_confidence", prompt: "How confident are you in identifying ethical and responsible AI use when handling institutional information?" },
    { subDimensionId: "stakeholder_engagement_awareness", metricType: "frequency", prompt: "How often are administrative staff invited to learn about or provide feedback on institutional AI use?" },
    { subDimensionId: "ai_literacy", metricType: "ability_confidence", prompt: "How confident are you in understanding the capabilities, limitations, and risks of AI tools relevant to your work?" },
    { subDimensionId: "ai_enhanced_teaching_curriculum", metricType: "awareness", prompt: "How aware are you of how your unit supports thoughtful AI use in student learning, training, or educational services?" },
    { subDimensionId: "expertise_development", metricType: "agreement", prompt: "My institution offers practical AI and data-skills development that is relevant to my administrative role." }
  ]),
  programming_staff: rows([
    { subDimensionId: "policy_compliance", metricType: "awareness", prompt: "How aware are you of the institutional AI policies, security standards, and approval processes that affect the systems you support?" },
    { subDimensionId: "ai_risk_incident_response", metricType: "ability_confidence", prompt: "How confident are you that your team can identify, escalate, and respond to an AI system incident or security concern?" },
    { subDimensionId: "ai_governance_access", metricType: "agreement", prompt: "Technical staff have meaningful input into institutional AI governance, access, and implementation decisions." },
    { subDimensionId: "adaptive_ai_policy_processes", metricType: "agreement", prompt: "AI policy and technical governance processes adapt as models, vendors, risks, and infrastructure needs change." },
    { subDimensionId: "leadership_resourcing", metricType: "agreement", prompt: "Leadership provides sufficient resources for secure, reliable, and responsible AI infrastructure and support." },
    { subDimensionId: "ai_performance_monitoring", metricType: "frequency", prompt: "How often are AI systems monitored for performance, reliability, safety, security, and operational impact?" },
    { subDimensionId: "infrastructure_privacy_security", metricType: "ability_confidence", prompt: "How confident are you that security weaknesses and privacy risks in AI tools are identified and addressed effectively?" },
    { subDimensionId: "ai_system_reliability_maintenance", metricType: "agreement", prompt: "There are clear maintenance, documentation, support, and change-management practices for AI systems you support." },
    { subDimensionId: "data_governance_management", metricType: "agreement", prompt: "Data used by AI systems have appropriate quality checks, access controls, lineage, and responsible management." },
    { subDimensionId: "equitable_ai_access", metricType: "agreement", prompt: "Technical design and provisioning practices support accessible and equitable use of approved AI tools." },
    { subDimensionId: "ai_workflow_integration", metricType: "agreement", prompt: "AI tools are integrated into technical and institutional workflows with appropriate testing, safeguards, and support." },
    { subDimensionId: "trust_transparency", metricType: "agreement", prompt: "AI system limitations, decisions, updates, and appropriate-use guidance are communicated clearly to users." },
    { subDimensionId: "ethics_responsible_use", metricType: "ability_confidence", prompt: "How confident are you in identifying ethical, fairness, accountability, and accessibility risks in AI systems?" },
    { subDimensionId: "stakeholder_engagement_awareness", metricType: "frequency", prompt: "How often do technical staff collaborate with affected stakeholders when planning or improving AI systems?" },
    { subDimensionId: "ai_literacy", metricType: "ability_confidence", prompt: "How confident are you in explaining AI system capabilities, limitations, and risks to nontechnical colleagues?" },
    { subDimensionId: "ai_enhanced_teaching_curriculum", metricType: "awareness", prompt: "How aware are you of the technical requirements needed to support responsible AI use in teaching and learning?" },
    { subDimensionId: "expertise_development", metricType: "agreement", prompt: "The institution offers relevant opportunities to develop advanced AI, security, data, and infrastructure expertise." }
  ]),
  finance_staff: rows([
    { subDimensionId: "policy_compliance", metricType: "awareness", prompt: "How aware are you of the AI policies, procurement requirements, and financial controls that apply to your work?" },
    { subDimensionId: "ai_risk_incident_response", metricType: "ability_confidence", prompt: "How confident are you that you know how to report an AI-related financial, vendor, compliance, or data concern?" },
    { subDimensionId: "ai_governance_access", metricType: "agreement", prompt: "Finance staff have a meaningful way to contribute to AI governance, procurement, and access decisions." },
    { subDimensionId: "adaptive_ai_policy_processes", metricType: "awareness", prompt: "How aware are you when AI policy, vendor, contract, or regulatory changes affect financial operations?" },
    { subDimensionId: "leadership_resourcing", metricType: "agreement", prompt: "Leadership evaluates AI investments with appropriate attention to cost, risk, return, and long-term resourcing." },
    { subDimensionId: "ai_performance_monitoring", metricType: "frequency", prompt: "How often are AI-enabled financial processes reviewed for accuracy, cost, compliance, and unintended impacts?" },
    { subDimensionId: "infrastructure_privacy_security", metricType: "ability_confidence", prompt: "How confident are you that AI tools used with financial, payroll, vendor, or student-account information meet privacy and security requirements?" },
    { subDimensionId: "ai_system_reliability_maintenance", metricType: "agreement", prompt: "Reliable support and contingency processes exist when AI-enabled finance tools fail or produce questionable outputs." },
    { subDimensionId: "data_governance_management", metricType: "agreement", prompt: "Financial and operational data are governed, validated, and protected before they are used by AI systems." },
    { subDimensionId: "equitable_ai_access", metricType: "agreement", prompt: "Approved AI tools, procurement processes, and support are accessible fairly across relevant finance teams." },
    { subDimensionId: "ai_workflow_integration", metricType: "agreement", prompt: "Approved AI tools improve forecasting, budgeting, purchasing, reporting, or other finance workflows in my area." },
    { subDimensionId: "trust_transparency", metricType: "agreement", prompt: "The institution is transparent about how AI-supported financial recommendations or risk signals are generated and used." },
    { subDimensionId: "ethics_responsible_use", metricType: "ability_confidence", prompt: "How confident are you in identifying fairness, accountability, accessibility, and bias concerns in AI-supported financial processes?" },
    { subDimensionId: "stakeholder_engagement_awareness", metricType: "frequency", prompt: "How often are finance staff included in institutional planning, governance, or communication about AI implementation?" },
    { subDimensionId: "ai_literacy", metricType: "ability_confidence", prompt: "How confident are you in understanding the capabilities, limitations, and risks of AI tools relevant to finance work?" },
    { subDimensionId: "ai_enhanced_teaching_curriculum", metricType: "awareness", prompt: "How aware are you of the financial planning or procurement needs related to responsible AI use in teaching and learning?" },
    { subDimensionId: "expertise_development", metricType: "agreement", prompt: "The institution offers practical AI, data, procurement, or financial-governance development relevant to my role." }
  ])
};

export function projectHearmesQuestionsForRole(role: InstrumentRole) {
  return PROJECT_HEARMES_QUESTION_ROWS[role].map((question, index) => {
    const subDimension = PROJECT_HEARMES_SUB_DIMENSIONS.find((item) => item.id === question.subDimensionId)!;
    const dimension = PROJECT_HEARMES_DIMENSIONS.find((item) => item.id === subDimension.dimensionId)!;
    return { ...question, id: `project-hearmes-${role}-${question.subDimensionId}`, questionType: "likert_5" as const, weight: 1, isAdaptiveSeed: index === 0 || index === 12, allowNotApplicable: true, allowDepartmentScope: true, subDimension, dimension };
  });
}
