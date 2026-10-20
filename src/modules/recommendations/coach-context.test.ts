import { describe, expect, it } from "vitest";
import { coachSystemPrompt, recentConversation, retrievalQuery } from "./coach-context.js";

const profile = {
  role: "student",
  institution: "University of North Carolina at Charlotte",
  unit: null,
  overallScore: 54.2,
  scores: [{ subDimension: "Trust & Transparency", dimension: "Culture", score: 25 }],
  coverage: { version: "project-hearmes-v2-draft", scoredResponseCount: 11, excludedResponseCount: 1, responseCoveragePercent: 91.7 },
  responses: [{ subDimension: "Trust & Transparency", prompt: "Can you explain AI use?", response: 2 }],
  optionalDimensionComments: [],
  strengths: ["AI Literacy"],
  priorities: ["Trust & Transparency"]
};

describe("AI readiness coach conversation context", () => {
  it("keeps recent messages and avoids duplicating the active question", () => {
    const turns = recentConversation([
      { role: "user", content: "Why is my trust score low?" },
      { role: "assistant", content: "It reflects limited confidence in explanations." },
      { role: "user", content: "How can I improve that?" }
    ], "How can I improve that?");
    expect(turns).toHaveLength(3);
    expect(turns.at(-1)).toEqual({ role: "user", content: "How can I improve that?" });
  });

  it("carries a prior user topic into retrieval for a follow-up", () => {
    const query = retrievalQuery([
      { role: "user", content: "Why is Trust & Transparency my lowest area?" },
      { role: "assistant", content: "It is related to confidence in clear AI explanations." }
    ], "How can I improve that?");
    expect(query).toContain("Trust & Transparency");
    expect(query).toContain("How can I improve that?");
  });

  it("bounds conversation context while retaining the newest turns", () => {
    const messages = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 ? "assistant" as const : "user" as const,
      content: `turn ${index}`
    }));
    const turns = recentConversation(messages, "new question");
    expect(turns).toHaveLength(9);
    expect(turns[0]?.content).toBe("turn 4");
    expect(turns.at(-1)?.content).toBe("new question");
  });

  it("instructs the coach to be concise, profile-aware, and evidence-grounded", () => {
    const prompt = coachSystemPrompt({ profile, roleLabel: "Student", cohortContext: "No peer data is available.", researchContext: "Research passage." });
    expect(prompt).toContain("one to three natural sentences");
    expect(prompt).toContain("Trust & Transparency");
    expect(prompt).toContain("Never invent scores");
    expect(prompt).toContain("prior conversation");
  });

  it("can build coach guidance when a profile has no scored details yet", () => {
    const prompt = coachSystemPrompt({
      profile: { ...profile, scores: [], responses: [], strengths: [], priorities: [] },
      roleLabel: "Student",
      cohortContext: "No peer data is available.",
      researchContext: "No Project HEARMES research source chunks were retrieved."
    });
    expect(prompt).toContain("assessment-specific guidance from general practical guidance");
    expect(prompt).toContain('"scores":[]');
  });
});
