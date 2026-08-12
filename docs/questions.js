(() => {
  const areas = [
    { subDimension: "Policy & Compliance", dimension: "Governance & Strategy" },
    { subDimension: "AI Governance & Access", dimension: "Governance & Strategy" },
    { subDimension: "Leadership & Resourcing", dimension: "Governance & Strategy" },
    { subDimension: "Monitoring & Evaluation", dimension: "Governance & Strategy" },
    { subDimension: "Infrastructure, Privacy & Security", dimension: "Systems & Infrastructure" },
    { subDimension: "Data", dimension: "Systems & Infrastructure" },
    { subDimension: "AI Integration & Use Cases", dimension: "Systems & Infrastructure" },
    { subDimension: "Trust & Transparency", dimension: "Culture" },
    { subDimension: "Ethics & Responsible Use", dimension: "Culture" },
    { subDimension: "Stakeholder Engagement & Awareness", dimension: "Culture" },
    { subDimension: "AI Literacy", dimension: "Education" },
    { subDimension: "Expertise Development", dimension: "Education" }
  ];

  const prompts = {
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
      "How available are opportunities for you to develop advanced AI experience through courses, research, internships, hackathons, or projects?"
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
      "How accessible are training, research collaborations, conferences, fellowships, and professional-development opportunities related to AI?"
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
      "How effectively does the institution recruit, retain, and develop the expertise required for long-term AI adoption?"
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
      "How prepared is the institution to develop or hire employees with the financial, legal, operational, and technical skills needed for AI adoption?"
    ],
    it_staff: [
      "How clearly do institutional AI policies define the technical controls, approval requirements, and escalation procedures you are responsible for implementing?",
      "How effectively are IT Staff involved in establishing role-based access, approved-tool pathways, and technical governance for AI services?",
      "How adequate are the staffing, budget, platforms, and leadership support available to operate AI services responsibly?",
      "How consistently does the IT organization monitor AI service performance, usage, incidents, security risks, and remediation outcomes?",
      "How prepared is the IT organization to secure AI integrations through privacy review, identity controls, encryption, logging, vendor review, and incident response?",
      "How effectively are data quality, ownership, access permissions, retention, and lineage managed across systems that support AI?",
      "How prepared is the IT organization to integrate approved AI capabilities with systems such as LMS, SIS, identity, service desk, and data platforms?",
      "How consistently do technical teams document AI system capabilities, limitations, data flows, decision logs, and escalation paths for affected users?",
      "How consistently are bias, misuse, accessibility, human oversight, and harmful failure modes evaluated before AI systems are deployed or expanded?",
      "How effectively does IT Staff gather requirements and feedback from students, faculty, staff, and leadership before and after AI services are introduced?",
      "How well do IT Staff understand AI capabilities, model limitations, prompt risks, security threats, data exposure, and verification practices?",
      "How available are opportunities to develop applied expertise in AI architecture, MLOps, data engineering, security, governance, and responsible deployment?"
    ]
  };

  window.HEAIR_QUESTION_BANK = Object.fromEntries(Object.entries(prompts).map(([role, questions]) => [role, questions.map((prompt, index) => ({ ...areas[index], prompt }))]));
})();
