import { describe, expect, it } from "vitest";
import { prepareFullHeairPaper } from "./full-paper-import.js";

describe("full HEAIR paper preparation", () => {
  it("preserves page metadata and reuses the normal chunking settings", () => {
    const text = Array.from({ length: 451 }, (_, index) => `word${index}`).join(" ");
    const prepared = prepareFullHeairPaper({ pages: [{ page: 2, section: "Methods", text }] });
    expect(prepared.chunks).toHaveLength(2);
    expect(prepared.chunks[0].metadata).toMatchObject({ kind: "full_paper", page: 2, section: "Methods" });
    expect(prepared.chunks[0].chunkText.split(" ")).toHaveLength(450);
    expect(prepared.chunks[1].chunkText.split(" ")[0]).toBe("word350");
  });

  it("rejects duplicate page numbers instead of mixing page provenance", () => {
    expect(() => prepareFullHeairPaper({ pages: [
      { page: 1, text: "First page" },
      { page: 1, text: "Different first page" }
    ] })).toThrow(/duplicate page/i);
  });
});
