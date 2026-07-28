/**
 * Curated, source-grounded retrieval corpus derived from the HEAIR framework
 * paper supplied for this project. It is intentionally a concise knowledge
 * source rather than a copy of the full paper, so the public application can
 * cite and use the framework without publishing the source PDF itself.
 */
export const HEAIR_DOCUMENT_ID = "ab0d1f27-7155-4eea-8e80-6ddc4b450001";
export const HEAIR_SOURCE_TITLE = "A Multistakeholder Approach to Higher Education AI Readiness (HEAIR)";
export const HEAIR_SOURCE_CITATION = "Tadimalla & Maher (2026), ASEE";

type HeairChunk = {
  chunkIndex: number;
  text: string;
  metadata: { kind: "framework" | "sub_dimension"; dimensionId?: string; subDimensionId?: string; roles: string[] };
};

const allRoles = ["student", "faculty", "administrator_leadership", "it_staff", "academic_business_affairs_staff"];

export const HEAIR_KNOWLEDGE_CHUNKS: HeairChunk[] = [
  {
    chunkIndex: 0,
    metadata: { kind: "framework", roles: allRoles },
    text: "HEAIR treats higher-education AI readiness as a parallel, cross-cutting process across five stakeholder groups: students, faculty, administrators or leadership, IT staff, and academic or business affairs staff. The framework connects their different responsibilities across four dimensions: Governance & Strategy, Systems & Infrastructure, Culture, and Education. It is a planning and reflection tool: a low score should guide participatory improvement, not label a person or institution as failing. The paper emphasizes that AI literacy is a shared foundation for every stakeholder group and that readiness depends on technical, organizational, cultural, ethical, and educational work happening together."
  },
  {
    chunkIndex: 1,
    metadata: { kind: "sub_dimension", dimensionId: "governance_strategy", subDimensionId: "policy_compliance", roles: allRoles },
    text: "For Policy & Compliance, HEAIR assigns different but connected responsibilities. Students should understand academic-integrity rules, copyright, plagiarism, fair use, data sharing, and institutional AI guidance. Faculty should align teaching practice and course-level rules with university policy. Administrators create and update institution-wide policy and align it with obligations such as privacy, accreditation, and responsible governance. IT teams operationalize policy through security governance, logging, audit trails, and compliant integrations. Academic and business affairs staff review vendor, procurement, licensing, finance, HR, and contractual risk. A useful improvement is to make approved-use guidance clear, role-specific, and easy to find."
  },
  {
    chunkIndex: 2,
    metadata: { kind: "sub_dimension", dimensionId: "governance_strategy", subDimensionId: "ai_governance_access", roles: allRoles },
    text: "HEAIR frames AI Governance & Access as inclusive decision-making plus practical access control. Students can participate in policy forums, town halls, advisory groups, and conversations about fairness and transparency. Faculty can advocate for departmental use guidelines and participatory decision-making. Administrators establish governance boards and cross-functional advisory groups while aligning access with inclusion strategies. IT staff implement role-based access, identity management, secure integration, and auditing of controls. Academic and business affairs staff manage licenses, contracts, and access barriers across business systems. Improvements should connect transparent governance processes with equitable access to approved tools."
  },
  {
    chunkIndex: 3,
    metadata: { kind: "sub_dimension", dimensionId: "governance_strategy", subDimensionId: "leadership_resourcing", roles: allRoles },
    text: "Leadership & Resourcing in HEAIR is about turning AI intent into sustained capacity. Students can advocate for accessible learning tools and participate in planning around curriculum needs. Faculty may seek grants, support, and partnerships for responsible AI-enhanced teaching and research. Administrators set institutional vision, prioritize strategic plans and budgets, and direct resources across instruction, research, and operations. IT staff plan for infrastructure, cloud platforms, innovation funding, and vendor renewals. Academic and business affairs staff develop cost models, financial impact assessments, procurement plans, and ROI reviews. A sound next step is a defined owner, a small budgeted pilot, and a review point rather than a vague commitment."
  },
  {
    chunkIndex: 4,
    metadata: { kind: "sub_dimension", dimensionId: "governance_strategy", subDimensionId: "monitoring_evaluation", roles: allRoles },
    text: "Monitoring & Evaluation makes AI readiness an ongoing practice. Students can provide feedback on learning tools and take part in evaluations of instructional value and risk. Faculty can use learning analytics, classroom pilots, and fairness reviews to improve practice. Administrators develop success metrics, conduct climate surveys, publish adoption and impact reports, and monitor equity. IT staff track uptime, usage, incidents, technical impact, and post-deployment reviews. Academic and business affairs staff examine service KPIs and scorecards for operational AI. HEAIR supports measuring outcomes, risks, fairness, accessibility, and stakeholder experience rather than measuring tool adoption alone."
  },
  {
    chunkIndex: 5,
    metadata: { kind: "sub_dimension", dimensionId: "systems_infrastructure", subDimensionId: "infrastructure_privacy_security", roles: allRoles },
    text: "HEAIR describes Infrastructure, Privacy & Security as the operational backbone for responsible AI. Students should have secure access and be able to raise privacy or surveillance concerns. Faculty should use compliant learning platforms, follow third-party-tool protocols, and teach data agency. Administrators lead risk assessment, secure procurement, and incident-response planning. IT staff implement access controls, encryption, data-loss prevention, firewall protections, secure vendor integration, and testing of AI APIs and pipelines. Academic and business affairs staff negotiate privacy, localization, residency, and protection terms in contracts. Improvements should start with approved-tool inventories, data-flow review, and clear escalation paths for risk."
  },
  {
    chunkIndex: 6,
    metadata: { kind: "sub_dimension", dimensionId: "systems_infrastructure", subDimensionId: "data", roles: allRoles },
    text: "The HEAIR Data sub-dimension covers quality, stewardship, fairness, access, and accountability. Students should understand how their data is collected and used and raise concerns about bias or over-surveillance. Faculty can use student-level information responsibly and build data literacy. Administrators oversee cross-campus governance and ethical analytics policy. IT staff maintain pipelines among systems such as LMS, SIS, and AI services; support anonymization or synthetic data; and audit missing or biased data. Academic and business affairs staff use data for operational forecasting and review demographic impact. A practical response should clarify data purpose, permissions, quality checks, and accountability before scaling an AI use case."
  },
  {
    chunkIndex: 7,
    metadata: { kind: "sub_dimension", dimensionId: "systems_infrastructure", subDimensionId: "ai_integration_use_cases", roles: allRoles },
    text: "AI Integration & Use Cases in HEAIR asks whether AI is used for valuable, appropriate higher-education work. Student examples include AI-assisted learning, tutoring, speech-to-text, feedback, and generative visuals. Faculty examples include pedagogically sound uses in grading support, content development, simulations, adaptive instruction, labs, and modules while protecting higher-order learning. Administrators prioritize integration roadmaps and may pilot advising or administrative workflow support. IT staff support enterprise AI platforms, APIs, dashboards, and integrations with campus systems. Academic and business affairs staff assess enterprise chatbots, scheduling, forecasting, and financial-modeling use cases. Start with a low-risk use case, success criteria, safeguards, and a review before expansion."
  },
  {
    chunkIndex: 8,
    metadata: { kind: "sub_dimension", dimensionId: "culture", subDimensionId: "trust_transparency", roles: allRoles },
    text: "Trust & Transparency in HEAIR concerns whether people can understand AI use, limitations, impacts, and decisions. Students evaluate whether AI feedback seems biased or misleading and seek explanations for AI-driven decisions. Faculty communicate AI use and limits, clearly define when AI is permitted, and are transparent about student-data collection. Administrators report institutional AI strategy and integrate explainability standards into review. IT staff implement explainable-AI practices, visual interpretation tools, bias detection, logs, and reasoning for outcomes. Academic and business affairs staff document tool purpose and workflow impact and assess vendor explainability claims. Improvements should make limitations, data use, decisions, and accountability visible to affected people."
  },
  {
    chunkIndex: 9,
    metadata: { kind: "sub_dimension", dimensionId: "culture", subDimensionId: "ethics_responsible_use", roles: allRoles },
    text: "HEAIR defines Ethics & Responsible Use as equity, access, integrity, consent, fairness, accountability, transparency, and accessibility across the AI lifecycle. Students can raise access and equity concerns, discuss ethics with peers, and reflect on AI-generated content. Faculty can teach through cases, review tool bias and consent with learners, and help learners balance productivity with integrity. Administrators create responsible-use charters and conduct ethics impact reviews. IT staff audit misuse and hallucinations, flag models that perform poorly for some populations, and evaluate lifecycle risk. Academic and business affairs staff screen vendors and align procurement and data-sharing with fairness, accountability, transparency, and accessibility. Choose practical, scenario-based guidance instead of generic ethics statements."
  },
  {
    chunkIndex: 10,
    metadata: { kind: "sub_dimension", dimensionId: "culture", subDimensionId: "stakeholder_engagement_awareness", roles: allRoles },
    text: "Stakeholder Engagement & Awareness ensures readiness is not imposed from one office. Students participate in co-design, town halls, feedback loops, surveys, and peer learning. Faculty can co-develop learning modules and pilots and contribute in departmental review. Administrators lead multi-stakeholder teams, communication strategies, updates, and timelines. IT staff provide onboarding, tool-specific guidance, service feedback channels, and opportunities to discuss capabilities and risks. Academic and business affairs staff lead awareness campaigns, prepare operational training, and align communication across AI touchpoints. HEAIR favors recurring feedback loops and accessible communications over one-time announcements."
  },
  {
    chunkIndex: 11,
    metadata: { kind: "sub_dimension", dimensionId: "education", subDimensionId: "ai_literacy", roles: allRoles },
    text: "In HEAIR, AI Literacy is a shared baseline for all roles. Students build technical knowledge, learn to interact responsibly with AI, understand social impact, practice with tools, and recognize intellectual-property and policy gaps. Faculty design discipline-specific literacy curricula and scaffold learning about bias, datasets, and model limits. Administrators support campus-wide literacy through workshops, centers, fellowships, and participation tracking. IT staff provide sandboxes, documentation, training videos, and tool support. Academic and business affairs staff develop onboarding for administrative AI and track staff learning. A useful literacy plan combines foundational concepts, hands-on practice, responsible-use scenarios, and opportunities to ask questions."
  },
  {
    chunkIndex: 12,
    metadata: { kind: "sub_dimension", dimensionId: "education", subDimensionId: "expertise_development", roles: allRoles },
    text: "Expertise Development extends foundational literacy into sustained capability. Students can participate in hackathons, internships, design sprints, portfolios, and research. Faculty pursue interdisciplinary collaboration, conferences, mentorship, and research on AI, education technology, or equity. Administrators invest in fellowships, joint positions, talent planning, job ladders, retention, and long-term learning systems. IT staff develop technical leadership in applied machine learning and data science. Academic and business affairs staff connect units with external AI leaders and support internal communities of practice. HEAIR suggests visible pathways, mentorship, practice opportunities, and career-relevant development rather than isolated training sessions."
  }
];
