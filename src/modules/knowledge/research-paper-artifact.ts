import { createHash } from "node:crypto";
import { z } from "zod";
import { chunkResearchText } from "./chunking.js";

export const RESEARCH_PAPER_ARTIFACT_SCHEMA_VERSION = 1;
export const RESEARCH_PAPER_ARTIFACT_TYPE = "research_paper_retrieval";
const allRoles = ["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"];

const pageSchema = z.object({
  page: z.number().int().positive(),
  section: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1)
});

const sourceTypeSchema = z.enum(["research_paper", "best_practice"]);
const chunkSchema = z.object({
  chunkText: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  metadata: z.object({
    kind: z.literal("research_paper"),
    page: z.number().int().positive(),
    section: z.string().min(1),
    roles: z.array(z.string().min(1)).min(1)
  })
});

const artifactPayloadSchema = z.object({
  schemaVersion: z.literal(RESEARCH_PAPER_ARTIFACT_SCHEMA_VERSION),
  artifactType: z.literal(RESEARCH_PAPER_ARTIFACT_TYPE),
  builtAt: z.string().datetime(),
  gitCommit: z.string().min(1),
  source: z.object({
    documentId: z.string().uuid(),
    title: z.string().trim().min(1).max(300),
    citation: z.string().trim().min(1).max(1_500),
    sourceType: sourceTypeSchema,
    inputSha256: z.string().regex(/^[a-f0-9]{64}$/),
    pageCount: z.number().int().positive()
  }),
  chunking: z.object({ sizeWords: z.literal(450), strideWords: z.literal(350) }),
  pages: z.array(pageSchema).min(1),
  chunks: z.array(chunkSchema).min(1)
});

const artifactSchema = artifactPayloadSchema.extend({
  integritySha256: z.string().regex(/^[a-f0-9]{64}$/)
});

export type ResearchPaperArtifact = z.infer<typeof artifactSchema>;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** A stable UUID makes re-importing a revised copy replace only that source. */
export function researchDocumentId(title: string, citation: string): string {
  const bytes = createHash("sha256").update(`${title.trim().toLocaleLowerCase()}\n${citation.trim().toLocaleLowerCase()}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

export function buildResearchPaperArtifact(input: {
  pages: unknown;
  title: string;
  citation: string;
  sourceType: "research_paper" | "best_practice";
  inputSha256: string;
  gitCommit: string;
  builtAt?: string;
}): ResearchPaperArtifact {
  const title = input.title.trim();
  const citation = input.citation.trim();
  const sourceType = sourceTypeSchema.parse(input.sourceType);
  const pages = z.array(pageSchema).min(1).parse(input.pages).sort((left, right) => left.page - right.page);
  if (new Set(pages.map((page) => page.page)).size !== pages.length) throw new Error("Paper input contains duplicate page numbers.");
  const chunks: z.infer<typeof chunkSchema>[] = [];
  for (const page of pages) {
    const section = page.section?.trim() || `PDF page ${page.page}`;
    for (const chunkText of chunkResearchText(page.text)) {
      chunks.push({ chunkText, chunkIndex: chunks.length, metadata: { kind: "research_paper", page: page.page, section, roles: allRoles } });
    }
  }
  if (!chunks.length) throw new Error("Paper input produced no searchable chunks.");
  const payload = {
    schemaVersion: RESEARCH_PAPER_ARTIFACT_SCHEMA_VERSION,
    artifactType: RESEARCH_PAPER_ARTIFACT_TYPE,
    builtAt: input.builtAt || new Date().toISOString(),
    gitCommit: input.gitCommit,
    source: {
      documentId: researchDocumentId(title, citation),
      title,
      citation,
      sourceType,
      inputSha256: input.inputSha256,
      pageCount: pages.length
    },
    chunking: { sizeWords: 450 as const, strideWords: 350 as const },
    pages,
    chunks
  };
  return artifactSchema.parse({ ...payload, integritySha256: sha256(canonicalJson(payload)) });
}

/** Rejects changed or incompatible external artifacts before they enter shared Coach retrieval. */
export function parseResearchPaperArtifact(value: unknown): ResearchPaperArtifact {
  const artifact = artifactSchema.parse(value);
  const { integritySha256, ...payload } = artifact;
  if (sha256(canonicalJson(payload)) !== integritySha256) throw new Error("Research-paper artifact integrity check failed. Rebuild it on ORION; do not import a modified artifact.");
  if (artifact.pages.length !== artifact.source.pageCount) throw new Error("Research-paper artifact page count does not match its manifest.");
  if (new Set(artifact.chunks.map((chunk) => chunk.chunkIndex)).size !== artifact.chunks.length) throw new Error("Research-paper artifact contains duplicate chunk indexes.");
  const sourcePages = new Set(artifact.pages.map((page) => page.page));
  if (artifact.chunks.some((chunk) => !sourcePages.has(chunk.metadata.page))) throw new Error("Research-paper artifact references a page outside its source manifest.");
  return artifact;
}
