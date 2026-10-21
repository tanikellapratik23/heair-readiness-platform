import { describe, expect, it } from "vitest";
import { PROJECT_HEARMES_METADATA_QUESTIONS, projectHearmesQuestionsForRole } from "./instrument.js";

describe("Project HEARMES contextual questions", () => {
  it("adds the same four non-scored contextual questions to every role", () => {
    for (const role of ["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"] as const) {
      const questions = projectHearmesQuestionsForRole(role);
      expect(questions).toHaveLength(21);
      expect(questions.filter((question) => question.includeInReadinessScore)).toHaveLength(17);
      expect(questions.filter((question) => !question.includeInReadinessScore).map((question) => question.id))
        .toEqual(PROJECT_HEARMES_METADATA_QUESTIONS.map((question) => `project-hearmes-${role}-${question.id}`));
    }
  });

  it("never marks contextual AI-use and training questions for readiness or institutional scoring", () => {
    for (const question of PROJECT_HEARMES_METADATA_QUESTIONS) {
      expect(question.includeInReadinessScore).toBe(false);
      expect(question.includeInInstitutionDashboard).toBe(false);
    }
  });
});
