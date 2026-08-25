# HEAIR assessment methodology

Current version: `heair-v1-provisional`

Status: requires HEAIR research-team approval before it can be described as a validated maturity model.
Methodology owner: HEAIR research team.

## Current calculation

Each scored Likert response is normalized from 1–5 to 0–100: 0, 25, 50, 75, and 100. Valid responses are weighted within a sub-dimension, sub-dimensions are averaged within a dimension, and available dimensions are averaged into the overall result. The implementation is in `src/lib/assessment-methodology.ts` and `src/modules/scoring/service.ts`.

`Not sure / Not enough information`, `Not applicable to my role`, and unanswered items never become zero. They are excluded from the score denominator. The report instead displays response coverage, which is a descriptive account of how many responses contributed to the result. It is not a statistical confidence interval.

A sub-dimension is presented as a supported strength only when its average response reaches the **Consistently applied** anchor (75/100). An improvement opportunity is presented only when its average is at or below **Partially established** (50/100). These interpretation rules derive from the questionnaire anchors; they are not approved institutional maturity levels.

## Interpretation

Until the research team approves score cutoffs with an owner, citation, and approval date, the platform uses neutral result language rather than claiming validated maturity levels. A future approved methodology record can define labels such as Strong, Developing, and Needs Attention without changing historical scores; every assessment stores its methodology version.

## Decisions awaiting validation

| Decision | Current treatment | Required approval evidence |
| --- | --- | --- |
| Score cutoffs / maturity labels | Not asserted as validated | HEAIR research-team citation, owner, and approval date |
| Question weights | Equal weighting | Validated weighting rationale or psychometric evidence |
| Peer-comparison privacy threshold | Minimum 5 distinct accounts per verified institution and role | Institutional privacy review |
| Department/unit aggregation threshold | Same minimum of 5 distinct accounts | Institutional privacy review |
| External RAG sources | Curated documents only | Source-quality review and update cadence |

Results represent stakeholder perceptions at the assessment date. They are not an objective institutional audit or a substitute for institutional decision-making.
