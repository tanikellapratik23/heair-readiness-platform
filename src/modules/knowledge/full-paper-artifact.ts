import { createHash } from "node:crypto";
import { z } from "zod";
import {
  FULL_HEAIR_PAPER_CITATION,
  FULL_HEAIR_PAPER_DOCUMENT_ID,
  FULL_HEAIR_PAPER_TITLE,
  fullPaperInputSchema,
  prepareFullHeairPaper
} from "./full-paper-import.js";

export const FULL_HEAIR_PAPER_ARTIFACT_SCHEMA_VERSION = 1;
export const FULL_HEAIR_PAPER_ARTIFACT_TYPE = "heair_full_paper_retrieval";

const chunkMetadataSchema = z.object({
  kind: z.literal("full_paper"),
  page: z.number().int().positive(),
  section: z.string().min(1),
  roles: z.array(z.string().min(1)).min(1)
});

const chunkSchema = z.object({
  chunkText: z.string().min(1),
  chunkIndex: z.number().int().nonnegative(),
  metadata: chunkMetadataSchema
});

const artifactPayloadSchema = z.object({
  schemaVersion: z.literal(FULL_HEAIR_PAPER_ARTIFACT_SCHEMA_VERSION),
  artifactType: z.literal(FULL_HEAIR_PAPER_ARTIFACT_TYPE),
  builtAt: z.string().datetime(),
  gitCommit: z.string().min(1),
  source: z.object({
    documentId: z.literal(FULL_HEAIR_PAPER_DOCUMENT_ID),
    title: z.literal(FULL_HEAIR_PAPER_TITLE),
    citation: z.literal(FULL_HEAIR_PAPER_CITATION),
    inputSha256: z.string().regex(/^[a-f0-9]{64}$/),
    pageCount: z.number().int().positive()
  }),
  chunking: z.object({
    sizeWords: z.literal(450),
    strideWords: z.literal(350)
  }),
  pages: fullPaperInputSchema.shape.pages,
  chunks: z.array(chunkSchema).min(1)
});

const artifactSchema = artifactPayloadSchema.extend({
  integritySha256: z.string().regex(/^[a-f0-9]{64}$/)
});

export type FullHeairPaperArtifact = z.infer<typeof artifactSchema>;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

export function buildFullHeairPaperArtifact(
  rawInput: unknown,
  inputSha256: string,
  gitCommit: string,
  builtAt = new Date().toISOString()
): FullHeairPaperArtifact {
  const prepared = prepareFullHeairPaper(rawInput);
  const payload = {
    schemaVersion: FULL_HEAIR_PAPER_ARTIFACT_SCHEMA_VERSION,
    artifactType: FULL_HEAIR_PAPER_ARTIFACT_TYPE,
    builtAt,
    gitCommit,
    source: {
      documentId: FULL_HEAIR_PAPER_DOCUMENT_ID,
      title: FULL_HEAIR_PAPER_TITLE,
      citation: FULL_HEAIR_PAPER_CITATION,
      inputSha256,
      pageCount: prepared.pages.length
    },
    chunking: { sizeWords: 450 as const, strideWords: 350 as const },
    pages: prepared.pages,
    chunks: prepared.chunks
  };
  return { ...payload, integritySha256: sha256(canonicalJson(payload)) };
}

/** Rejects modified, incompatible, or incomplete ORION artifacts before database import. */
export function parseFullHeairPaperArtifact(value: unknown): FullHeairPaperArtifact {
  const artifact = artifactSchema.parse(value);
  const { integritySha256, ...payload } = artifact;
  if (sha256(canonicalJson(payload)) !== integritySha256) {
    throw new Error("HEAIR paper artifact integrity check failed. Rebuild it on ORION; do not import a modified artifact.");
  }
  if (artifact.pages.length !== artifact.source.pageCount) {
    throw new Error("HEAIR paper artifact page count does not match its manifest.");
  }
  if (new Set(artifact.chunks.map((chunk) => chunk.chunkIndex)).size !== artifact.chunks.length) {
    throw new Error("HEAIR paper artifact contains duplicate chunk indexes.");
  }
  return artifact;
}
