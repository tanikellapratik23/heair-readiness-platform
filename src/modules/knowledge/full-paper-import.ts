import { z } from "zod";
import { chunkResearchText } from "./chunking.js";

export const FULL_HEAIR_PAPER_DOCUMENT_ID = "3ca50b8d-079b-4776-b16f-8d5f95588235";
export const FULL_HEAIR_PAPER_TITLE = "A Multistakeholder Approach to Higher Education AI Readiness (HEAIR)";
export const FULL_HEAIR_PAPER_CITATION = "Tadimalla & Maher (2026), ASEE";

const pageSchema = z.object({
  page: z.number().int().positive(),
  section: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1)
});

export const fullPaperInputSchema = z.object({
  pages: z.array(pageSchema).min(1)
});

export type PreparedPaperChunk = {
  chunkText: string;
  chunkIndex: number;
  metadata: {
    kind: "full_paper";
    page: number;
    section: string;
    roles: string[];
  };
};

const allRoles = ["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"];

/**
 * Preserves PDF page provenance while reusing the application's 450-word,
 * 350-word-stride chunking convention. The result is deterministic so a
 * re-import replaces, rather than mixes with, an earlier paper import.
 */
export function prepareFullHeairPaper(input: unknown) {
  const parsed = fullPaperInputSchema.parse(input);
  const pages = [...parsed.pages].sort((left, right) => left.page - right.page);
  if (new Set(pages.map((page) => page.page)).size !== pages.length) throw new Error("Paper input contains duplicate page numbers.");

  const chunks: PreparedPaperChunk[] = [];
  for (const page of pages) {
    const section = page.section?.trim() || `PDF page ${page.page}`;
    for (const chunkText of chunkResearchText(page.text)) {
      chunks.push({
        chunkText,
        chunkIndex: chunks.length,
        metadata: { kind: "full_paper", page: page.page, section, roles: allRoles }
      });
    }
  }
  if (!chunks.length) throw new Error("Paper input produced no searchable chunks.");
  return { pages, chunks };
}
