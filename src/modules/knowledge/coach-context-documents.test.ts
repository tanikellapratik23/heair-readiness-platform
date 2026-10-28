import { describe, expect, it } from "vitest";
import { COACH_CONTEXT_MAX_BYTES, chunkCoachContextText, parseCoachContextUpload } from "./coach-context-documents.js";

describe("private coach context uploads", () => {
  it("parses supported text files and creates deterministic chunks", () => {
    const content = "Department policy guidance ".repeat(450);
    const encoded = Buffer.from(content, "utf8").toString("base64");
    const parsed = parseCoachContextUpload("AI policy.md", encoded);
    expect(parsed.title).toBe("AI policy");
    expect(parsed.mediaType).toBe("text/markdown");
    expect(parsed.chunks.length).toBeGreaterThan(1);
    expect(parsed.sha256).toHaveLength(64);
    expect(chunkCoachContextText(content)).toEqual(parsed.chunks);
  });

  it("rejects unsupported or oversized files", () => {
    const valid = Buffer.from("This is an institutional AI policy with sufficient content for coaching.").toString("base64");
    expect(() => parseCoachContextUpload("policy.pdf", valid)).toThrow(".txt, .md, .csv, or .json");
    const oversized = Buffer.alloc(COACH_CONTEXT_MAX_BYTES + 1, 65).toString("base64");
    expect(() => parseCoachContextUpload("policy.txt", oversized)).toThrow("2 MB");
  });
});
