import { describe, expect, it } from "vitest";
import { calculateResponseCoverage, coverageFromCounts, isExcludedResponse, normalizeLikert } from "./assessment-methodology.js";

describe("HEAIR response handling", () => {
  it("normalizes only valid Likert responses", () => {
    expect(normalizeLikert(1)).toBe(0);
    expect(normalizeLikert(5)).toBe(100);
    expect(normalizeLikert({ value: 3, scope: "department_or_team" })).toBe(50);
    expect(normalizeLikert("not_sure")).toBeNull();
    expect(normalizeLikert("not_applicable")).toBeNull();
  });

  it("never converts not sure or not applicable into a zero", () => {
    expect(isExcludedResponse("not_sure")).toBe(true);
    expect(isExcludedResponse("not_applicable")).toBe(true);
    expect(isExcludedResponse(1)).toBe(false);
  });

  it("recalculates coverage after excluded answers", () => {
    const coverage = calculateResponseCoverage([1, 3, "not_sure", "not_applicable", 5], 5);
    expect(coverage.scored).toBe(3);
    expect(coverage.excluded).toBe(2);
    expect(coverage.percentage).toBe(60);
    expect(coverage.label).toBe("Moderate");
  });

  it("labels a low-information result without claiming statistical confidence", () => {
    const coverage = coverageFromCounts({ totalQuestions: 12, answered: 12, scored: 2, excluded: 10 });
    expect(coverage.label).toBe("Limited");
    expect(coverage.explanation).toContain("did not lower the readiness score");
  });
});
