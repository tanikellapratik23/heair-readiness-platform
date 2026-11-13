import { describe, expect, it } from "vitest";
import { buildFullHeairPaperArtifact, parseFullHeairPaperArtifact, sha256 } from "./full-paper-artifact.js";

const input = { pages: [{ page: 1, section: "Introduction", text: "HEAIR supports accountable higher education AI adoption." }] };

describe("full HEAIR paper artifact", () => {
  it("preserves page-aware chunks in a verifiable portable artifact", () => {
    const artifact = buildFullHeairPaperArtifact(input, sha256(JSON.stringify(input)), "test-commit", "2026-11-13T12:00:00.000Z");
    const loaded = parseFullHeairPaperArtifact(artifact);
    expect(loaded.source.pageCount).toBe(1);
    expect(loaded.chunks[0]).toMatchObject({ chunkIndex: 0, metadata: { page: 1, section: "Introduction" } });
  });

  it("rejects an artifact whose chunk text was modified after it was built", () => {
    const artifact = buildFullHeairPaperArtifact(input, sha256(JSON.stringify(input)), "test-commit", "2026-11-13T12:00:00.000Z");
    artifact.chunks[0].chunkText = "Modified after validation";
    expect(() => parseFullHeairPaperArtifact(artifact)).toThrow(/integrity/i);
  });
});
