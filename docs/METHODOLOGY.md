# Project HEARMES assessment methodology

Current version: `project-hearmes-v2-draft`

Status: requires Project HEARMES research-team approval before it can be described as a validated maturity model.
Methodology owner: Project HEARMES research team.

## Current calculation

Each scored response is normalized from 1–5 to 0–100: 0, 25, 50, 75, and 100. Every question carries its own declared metric type: awareness, frequency, ability/confidence, likelihood, importance, or agreement. Valid responses are weighted within a sub-dimension, sub-dimensions are averaged within a dimension, and available dimensions are averaged into the overall result. The implementation is in `src/lib/instrument.ts`, `src/lib/assessment-methodology.ts`, and `src/modules/scoring/service.ts`.

`Not sure / Not enough information`, `Not applicable to my role`, and unanswered items never become zero. They are excluded from the score denominator. The report instead displays response coverage, which is a descriptive account of how many responses contributed to the result. It is not a statistical confidence interval.

A sub-dimension is presented as a relative strength at 75/100 or higher and an improvement opportunity at 50/100 or lower. Because response anchors differ by metric type, these are score-position rules, not universal institutional-maturity claims. They remain subject to research-team approval.

## Interpretation

Until the research team approves score cutoffs with an owner, citation, and approval date, the platform uses neutral result language rather than claiming validated maturity levels. A future approved methodology record can define labels such as Strong, Developing, and Needs Attention without changing historical scores; every assessment stores its methodology version.

## Decisions awaiting validation

| Decision | Current treatment | Required approval evidence |
| --- | --- | --- |
| Score cutoffs / maturity labels | Not asserted as validated | Project HEARMES research-team citation, owner, and approval date |
| Question weights | Equal weighting | Validated weighting rationale or psychometric evidence |
| Peer-comparison privacy threshold | Minimum 5 distinct accounts per verified institution and role | Institutional privacy review |
| Department/unit aggregation threshold | Same minimum of 5 distinct accounts | Institutional privacy review |
| External RAG sources | Curated documents only | Source-quality review and update cadence |

Results represent stakeholder perceptions at the assessment date. They are not an objective institutional audit or a substitute for institutional decision-making.
