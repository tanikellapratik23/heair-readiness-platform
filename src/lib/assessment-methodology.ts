/**
 * Central assessment rules used by scoring, APIs, and the static client.
 *
 * HEAIR score thresholds are intentionally not asserted as a validated maturity
 * model here. Until the research team approves thresholds, callers should use
 * neutral result language and the response-coverage descriptor below.
 */
export const METHODOLOGY_VERSION = "heair-v1-provisional";
export const METHODOLOGY_STATUS = "requires_research_team_approval" as const;
export const MINIMUM_PEER_RESPONDENTS = 5;

export const LIKERT_ANCHORS = [
  { value: 1, label: "Not established", detail: "Not yet in place" },
  { value: 2, label: "Informal or rarely applied", detail: "Inconsistent or ad hoc" },
  { value: 3, label: "Partially established", detail: "Developing in some areas" },
  { value: 4, label: "Consistently applied", detail: "Working well in regular practice" },
  { value: 5, label: "Institutionally established", detail: "A clear, sustained strength" }
] as const;

export const EXCLUDED_RESPONSE_VALUES = ["not_sure", "not_applicable"] as const;
export type ExcludedResponseValue = (typeof EXCLUDED_RESPONSE_VALUES)[number];
export type ResponseScope = "department_or_team";
export type AssessmentResponseValue = number | string | boolean | { value: number | string; scope?: ResponseScope } | null;

export type Coverage = {
  answered: number;
  scored: number;
  excluded: number;
  unanswered: number;
  percentage: number;
  label: "High" | "Moderate" | "Limited" | "Unavailable";
  explanation: string;
};

function rawValue(value: AssessmentResponseValue): unknown {
  return value && typeof value === "object" && !Array.isArray(value) ? value.value : value;
}

export function isExcludedResponse(value: AssessmentResponseValue): value is ExcludedResponseValue | { value: ExcludedResponseValue; scope?: ResponseScope } {
  const raw = rawValue(value);
  return raw === "not_sure" || raw === "not_applicable";
}

export function responseScope(value: AssessmentResponseValue): ResponseScope | null {
  return value && typeof value === "object" && !Array.isArray(value) && value.scope === "department_or_team" ? value.scope : null;
}

export function normalizeLikert(value: AssessmentResponseValue): number | null {
  const raw = rawValue(value);
  return typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 5 ? (raw - 1) * 25 : null;
}

/**
 * Response coverage describes how much of a result is based on scorable
 * answers. It is not a statistical confidence interval and must not be
 * represented as one.
 */
export function calculateResponseCoverage(values: AssessmentResponseValue[], totalQuestions = values.length): Coverage {
  const answered = values.filter((value) => value !== undefined && value !== null).length;
  const excluded = values.filter((value) => isExcludedResponse(value)).length;
  const scored = values.filter((value) => !isExcludedResponse(value) && normalizeLikert(value) !== null).length;
  const unanswered = Math.max(0, totalQuestions - answered);
  const percentage = totalQuestions ? Math.round((scored / totalQuestions) * 100) : 0;
  const label: Coverage["label"] = scored === 0 ? "Unavailable" : percentage >= 80 ? "High" : percentage >= 50 ? "Moderate" : "Limited";
  const exclusions = excluded + unanswered;
  const explanation = exclusions
    ? `${exclusions} ${exclusions === 1 ? "question was" : "questions were"} excluded or unanswered and did not lower the readiness score.`
    : "All required questions contributed to the readiness score.";
  return { answered, scored, excluded, unanswered, percentage, label, explanation };
}

export function coverageFromCounts({ totalQuestions, answered, scored, excluded }: { totalQuestions: number; answered: number; scored: number; excluded: number }): Coverage {
  const unanswered = Math.max(0, totalQuestions - answered);
  const percentage = totalQuestions ? Math.round((scored / totalQuestions) * 100) : 0;
  const label: Coverage["label"] = scored === 0 ? "Unavailable" : percentage >= 80 ? "High" : percentage >= 50 ? "Moderate" : "Limited";
  const omissions = excluded + unanswered;
  const explanation = omissions
    ? `${omissions} ${omissions === 1 ? "question was" : "questions were"} excluded or unanswered and did not lower the readiness score.`
    : "All required questions contributed to the readiness score.";
  return { answered, scored, excluded, unanswered, percentage, label, explanation };
}

export function neutralReadinessLabel(coverage: Coverage) {
  return coverage.scored ? "Readiness result" : "Insufficient scored responses";
}
