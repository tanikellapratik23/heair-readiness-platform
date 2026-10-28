import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";

// Sparse signed feature hashing is a reproducible lexical embedding, not a neural semantic model.
// Both documents and queries use this exact implementation and version.
export const MODEL = "hearmes-signed-word-hash-v1";
export const DIMENSIONS = 4096;
export const artifactSchema = z.object({
  manifest: z.object({ schemaVersion: z.literal(1), model: z.literal(MODEL), modelRevision: z.literal("1"), dimensions: z.literal(DIMENSIONS), normalization: z.literal("l2"), similarity: z.literal("cosine"), preprocessing: z.literal("unicode-nfkc-lowercase-word-v1"), chunking: z.object({ sizeWords: z.literal(450), strideWords: z.literal(350) }), documentCount: z.number().int().positive(), chunkCount: z.number().int().positive(), inputs: z.array(z.object({ id: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).min(1), nodeVersion: z.string(), packageVersions: z.record(z.string()), builtAt: z.string().datetime(), gitCommit: z.string().min(1) }),
  chunks: z.array(z.object({ id: z.string(), documentId: z.string(), chunkIndex: z.number().int().nonnegative(), text: z.string().min(1), vector: z.array(z.tuple([z.number().int().min(0).max(DIMENSIONS - 1), z.number().finite()])), sourceTitle: z.string().min(1), citation: z.string().nullable(), publisher: z.string().nullable(), publishedAt: z.string().nullable(), sourceType: z.enum(["heair_paper", "framework", "research_paper", "best_practice"]), section: z.string(), page: z.string().nullable(), roles: z.array(z.string()), dimensionId: z.string().optional(), subDimensionId: z.string().optional() })).min(1)
});
export type Artifact = z.infer<typeof artifactSchema>;
export function sha256(value: string | Buffer) { return createHash("sha256").update(value).digest("hex"); }
export function embed(text: string): [number, number][] {
  const terms = text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const counts = new Map<number, number>();
  for (const term of terms) {
    const hash = createHash("sha256").update(term).digest();
    const index = hash.readUInt32BE(0) % DIMENSIONS;
    counts.set(index, (counts.get(index) ?? 0) + (hash[4] & 1 ? 1 : -1));
  }
  const norm = Math.sqrt([...counts.values()].reduce((sum, value) => sum + value * value, 0));
  return norm ? [...counts].filter(([, value]) => value !== 0).sort(([a], [b]) => a - b).map(([index, value]) => [index, value / norm]) : [];
}
export function cosine(left: [number, number][], right: [number, number][]) {
  let i = 0, j = 0, sum = 0;
  while (i < left.length && j < right.length) {
    if (left[i][0] === right[j][0]) { sum += left[i][1] * right[j][1]; i++; j++; }
    else if (left[i][0] < right[j][0]) i++; else j++;
  }
  return sum;
}
export function validateArtifact(input: unknown): Artifact {
  const parsed = artifactSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid or incompatible research artifact: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  const a = parsed.data;
  if (a.chunks.length !== a.manifest.chunkCount || new Set(a.chunks.map(c => c.id)).size !== a.chunks.length || new Set(a.chunks.map(c => c.documentId)).size !== a.manifest.documentCount || a.manifest.inputs.length !== a.manifest.documentCount || new Set(a.manifest.inputs.map(i => i.id)).size !== a.manifest.documentCount || a.chunks.some(c => !a.manifest.inputs.some(i => i.id === c.documentId))) throw new Error("Invalid research artifact: inconsistent counts, document references, or duplicate IDs");
  for (const chunk of a.chunks) {
    if (JSON.stringify(embed(chunk.text)) !== JSON.stringify(chunk.vector)) throw new Error(`Invalid research artifact: embedding mismatch for chunk ${chunk.id}`);
  }
  return a;
}
export function loadArtifact(path: string): Artifact {
  try { return validateArtifact(JSON.parse(readFileSync(path, "utf8"))); }
  catch (error) { throw new Error(`Unable to load research artifact ${path}: ${error instanceof Error ? error.message : String(error)}`); }
}
let configuredArtifact: Artifact | undefined;
export function initializeResearchArtifact() {
  const path = process.env.HEAIR_RETRIEVAL_ARTIFACT_PATH;
  configuredArtifact = path ? loadArtifact(path) : undefined;
}
export function getResearchArtifact() { return configuredArtifact; }
