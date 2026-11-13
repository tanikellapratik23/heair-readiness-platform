import { describe, expect, it } from "vitest";
import { buildResearchPaperArtifact, parseResearchPaperArtifact, researchDocumentId, sha256 } from "./research-paper-artifact.js";

const pages = [{ page: 2, section: "Methods", text: Array.from({ length: 451 }, (_, index) => `word${index}`).join(" ") }];

describe("research-paper artifact", () => {
  it("creates a page-cited artifact with a stable document identity", () => {
    const artifact = buildResearchPaperArtifact({
      pages,
      title: "Approved research paper",
      citation: "Author (2026), DOI: 10.1234/example",
      sourceType: "research_paper",
      inputSha256: sha256(JSON.stringify({ pages })),
      gitCommit: "test-commit",
      builtAt: "2026-11-13T12:00:00.000Z"
    });
    expect(artifact.chunks).toHaveLength(2);
    expect(artifact.chunks[0].metadata).toMatchObject({ kind: "research_paper", page: 2, section: "Methods" });
    expect(artifact.source.documentId).toBe(researchDocumentId("Approved research paper", "Author (2026), DOI: 10.1234/example"));
    expect(parseResearchPaperArtifact(artifact).source.title).toBe("Approved research paper");
  });

  it("rejects a modified artifact before it can enter shared retrieval", () => {
    const artifact = buildResearchPaperArtifact({
      pages: [{ page: 1, text: "Approved evidence." }],
      title: "Approved research paper",
      citation: "Author (2026)",
      sourceType: "best_practice",
      inputSha256: "a".repeat(64),
      gitCommit: "test-commit",
      builtAt: "2026-11-13T12:00:00.000Z"
    });
    artifact.chunks[0].chunkText = "Changed after validation.";
    expect(() => parseResearchPaperArtifact(artifact)).toThrow(/integrity/i);
  });
});
