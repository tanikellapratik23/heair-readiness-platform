# Project HEARMES AI maturity and readiness model dataset

Status: research working dataset, not a validated Project HEARMES maturity model.  
Owner: Project HEARMES research team.  
Last reviewed: 2026-10-21.  
Scope: external AI-readiness, AI-maturity, responsible-AI, and AI-management models that can inform — but do not automatically determine — Project HEARMES interpretation.

## Purpose

Project HEARMES measures role-specific stakeholder perceptions of higher-education AI readiness. This dataset supports a future, evidence-informed maturity interpretation layer. It must not turn a readiness score into a claim that an individual, department, or institution has achieved a validated maturity stage until the research team approves the rubric, thresholds, owner, citation, and approval date.

The accompanying maturity notes identify two useful patterns to investigate: staged maturity models and a two-axis foundations-versus-differentiation view. The notes are an input to this dataset, not validation evidence by themselves.

## Dataset schema

Use one record per external model. The fields below can be copied into a CSV or research database later.

| Field | Meaning |
| --- | --- |
| `model_id` | Stable internal identifier, for example `gartner-ai-maturity-2025` |
| `organization` | Model publisher or steward |
| `title` | Official model or framework title |
| `year_or_version` | Publication year, version, or retrieval date |
| `model_type` | `stage`, `quadrant`, `management-standard`, `risk-framework`, or `capability-model` |
| `levels_or_axes` | Stages or axes exactly as described by the source |
| `domains` | What the model assesses |
| `evidence_basis` | Reported research, practitioner input, validation, or lack thereof |
| `hearmes_crosswalk` | Proposed relationship to HEARMES dimensions; never a direct score conversion |
| `recommended_use` | How Project HEARMES may use the model |
| `not_for_use` | What the model must not be used to claim |
| `source_url` | Canonical source |
| `accessed_on` | Date the source was reviewed |
| `review_status` | `candidate`, `reviewed`, or `approved-for-crosswalk` |

## Initial research dataset

| model_id | Model and type | Levels or axes | Evidence basis reported by publisher | Proposed HEARMES use | Important limitation |
| --- | --- | --- | --- | --- | --- |
| `gartner-ai-maturity-toolkit` | Gartner AI Maturity Model Toolkit; stage/capability model | Foundational, Emerging, Operational, Scaled, Transformational | Vendor research toolkit spanning strategy, data, governance, engineering, operating model, culture, and AI value | Vocabulary for an institutional roadmap and domain coverage check | Do not copy its stages into HEARMES score bands without higher-education validation. |
| `ibm-genai-adoption-maturity` | IBM Generative AI Adoption Maturity Model; stage model | Five phases from generic-model experimentation through secure, refined enterprise use | Architecture guidance focused on model fit, data, governance, operations, scale, and feedback | Systems and infrastructure operational examples; RAG and model-operation discussion | GenAI architecture maturity is not a role-perception instrument. |
| `accenture-art-of-ai` | Accenture Art of AI Maturity; quadrant model | AI foundation capabilities × AI differentiation capabilities | Accenture maturity index with foundation and differentiation capability groups | Candidate visual archetype: HEARMES foundations and people/learning readiness can be plotted as two explicitly defined axes | Quadrant names and midpoints must be research-team defined and tested; no individual-level institutional claim. |
| `accenture-sei-ai-adoption` | Accenture–Carnegie Mellon SEI AI Adoption Maturity Model; capability model | Eight dimensions rather than a published HEARMES-style score conversion | Publisher reports review of over 100 maturity efforts, executive interviews, practitioner survey, and pilots | Benchmark HEARMES domain coverage: strategy, workforce/culture, workflows, risk/governance, data, engineering, operations, ecosystem | External corporate evidence does not validate HEARMES questions or thresholds. |
| `microsoft-rai-maturity` | Microsoft Responsible AI Maturity Model; stage/capability model | Latent, Emerging, Developing, Realizing, Leading | Microsoft reports more than 90 specialist and practitioner interviews/focus groups across 24 dimensions | Draft descriptor-writing method for governance, culture, team process, and responsible-use subdimensions | Responsible-AI maturity is only one part of broad institutional AI readiness. |
| `nist-ai-rmf` | NIST AI Risk Management Framework; risk framework | Govern, Map, Measure, Manage; Govern is cross-cutting | U.S. government voluntary risk-management framework | Validity crosswalk and evidence checklist for governance, trust, data, and monitoring descriptors | It is not a maturity model and must not be converted into levels by default. |
| `iso-iec-42001` | ISO/IEC 42001; AI management-system standard | Management-system lifecycle and continual improvement, not levels | International management-system standard | Crosswalk for policy, accountability, data governance, monitoring, risk, and continual-improvement evidence | Certification/standard conformance is not an individual or institution HEARMES score. |
| `microsoft-agentic-adoption` | Microsoft Agentic AI Adoption Maturity Model; capability model | Progressive maturity across strategy, process, governance, value, architecture, operations, culture/readiness, and responsible AI | Vendor implementation guidance | Optional practical examples for technical and operational next steps | Agent-specific and vendor-specific; unsuitable as a universal HEARMES maturity scale. |

### Canonical sources

- Gartner: <https://www.gartner.com/en/chief-information-officer/research/ai-maturity-model-toolkit>
- IBM: <https://www.ibm.com/think/architectures/patterns/genai-adoption-maturity-model>
- Accenture Art of AI: <https://www.accenture.com/content/dam/accenture/final/a-com-migration/manual/r3/pdf/pdf-4/Accenture-Art-of-AI-Maturity-Report.pdf>
- Accenture–SEI: <https://newsroom.accenture.com/news/2026/accenture-and-the-carnegie-mellon-university-software-engineering-institute-launch-ai-adoption-maturity-model-to-help-organizations-scale-ai-with-predictable-outcomes>
- Microsoft Responsible AI: <https://www.microsoft.com/en-us/research/publication/responsible-ai-maturity-model/>
- NIST AI RMF: <https://www.nist.gov/itl/ai-risk-management-framework>
- ISO/IEC 42001: <https://www.iso.org/standard/42001>
- Microsoft agentic adoption: <https://learn.microsoft.com/en-us/agents/adoption-maturity-model/>

## Proposed HEARMES crosswalk

| HEARMES dimension | External concepts to examine | What is distinctly HEARMES |
| --- | --- | --- |
| Governance & Strategy | Strategy, governance, operating model, risk, responsible AI, AI-management systems | Role-specific awareness of, access to, and participation in higher-education AI decision-making |
| Systems & Infrastructure | Data, engineering, operations, security, monitoring, model lifecycle | Practical institutional systems as experienced by faculty, students, staff, and leadership |
| Culture | Workforce/culture, organizational foundations, collaboration, trust and transparency | Differences among stakeholder perceptions and the social conditions for responsible AI adoption |
| Education | Skills, training, learning pathways, capability development | Teaching, learning, curriculum, and campus training context not fully represented in enterprise maturity models |

## Design decisions to validate before implementation

1. **Keep readiness and maturity separate.** HEARMES should continue storing the normalized response score, response coverage, methodology version, and source scope. A maturity label is a separate interpretation created only by an approved versioned rubric.
2. **No default maturity cutoffs.** Do not treat 0–20, 21–40, and similar bands as validated merely because a five-level framework exists. Thresholds require research-team ownership, citation, approval date, and empirical testing.
3. **Descriptors should be specific to each subdimension.** A future five-level rubric could use neutral draft labels such as Awareness, Exploring, Operational, Systemic, and Transformational, but each of the 17 subdimensions needs observable, higher-education-specific descriptors at each level.
4. **Aggregate only at a privacy-safe scope.** Institution, role, and department maturity analytics require at least five distinct eligible accounts in every displayed cell, backend enforcement, a reporting period, and methodology version. Do not infer or publish an institution-wide result from one respondent.
5. **Use archetypes as descriptive visuals, not diagnoses.** A two-axis chart can show group aggregates. Candidate axes are (a) foundations: Governance & Strategy + Systems & Infrastructure and (b) people and learning readiness: Culture + Education. Quadrant names and midpoint require approval and empirical review.

## Recommended validation plan

### Phase 1 — content validity

- Build a draft rubric for all 17 subdimensions from HEARMES construct definitions and the crosswalk above.
- Have higher-education AI governance, teaching/learning, technical, finance, student, and assessment-methodology experts review each descriptor.
- Record content changes, methodology owner, source citations, and approval status.

### Phase 2 — instrument and interpretation testing

- Conduct cognitive interviews with every stakeholder role to test whether questions and descriptors mean what respondents understand them to mean.
- Pilot across more than one institution and test reliability, factor structure, and whether the measure behaves comparably across roles before making cross-role maturity comparisons.
- Test test–retest stability and longitudinal sensitivity before claiming that a score change represents maturity progress.

### Phase 3 — institutional analytics

- Evaluate role-level, department-level, and institution-level aggregation rules separately from individual results.
- Check privacy suppression, missing-data behavior, response coverage, and representation of stakeholder roles.
- Compare exploratory archetypes with observed data only after an adequate, consented research sample exists; document that analysis as exploratory.

## Implementation recommendation for the existing platform

The current code already has the right foundation: each assessment and chat record stores a `methodologyVersion`, and `AssessmentMethodology.configuration` can hold a versioned rubric. A later approved version can add a configuration like `project-hearmes-v3-maturity-draft` without rewriting historical scores.

The smallest safe implementation sequence is:

1. Add a **draft-only** rubric configuration with owner, citation, approval status, dimension/subdimension descriptors, and an explicit aggregation rule.
2. Add pure maturity/archetype helper functions that receive the stored methodology configuration; do not hard-code cutoffs in report components.
3. Return no maturity label unless the referenced methodology record is `approved`.
4. Add privacy-suppressed analytics endpoints only after aggregate rules have been reviewed.
5. Preserve the existing score/recommendation path until the research team approves the new interpretation layer.

The report currently uses score-position rules for strengths and opportunities. Those rules should remain visibly separate from any future maturity rubric.

## Research questions this dataset supports

- Which HEARMES dimensions overlap with established AI maturity models, and which higher-education concerns are missing from enterprise models?
- Can stakeholder-specific perception data support a valid institutional readiness interpretation after appropriate aggregation?
- Does a two-axis foundations and people/learning archetype help institutions choose next actions more clearly than one overall score?
- What evidence is required before HEARMES can move from descriptive readiness results to validated maturity classifications?
