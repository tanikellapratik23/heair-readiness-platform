import { readFile, open, link, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { z } from "zod";
import { chunkResearchText } from "./chunking.js";
import { DIMENSIONS, MODEL, embed, sha256, validateArtifact } from "./artifact.js";

const inputSchema = z.object({ documents: z.array(z.object({ path: z.string().min(1), title: z.string().min(1), sourceType: z.enum(["heair_paper", "framework", "research_paper", "best_practice"]), citation: z.string().optional(), publisher: z.string().optional(), publishedAt: z.string().optional(), section: z.string().optional(), page: z.string().optional(), roles: z.array(z.string()).optional(), dimensionId: z.string().optional(), subDimensionId: z.string().optional() })).min(1) });

export async function buildArtifact(inputPath: string, outputPath: string) {
  const input = inputSchema.parse(JSON.parse(await readFile(inputPath, "utf8")));
  const chunks: unknown[] = [], inputs: { id: string; sha256: string }[] = [];
  for (const doc of input.documents) {
    if (!doc.path.toLowerCase().endsWith(".txt")) throw new Error(`Unsupported research document (only UTF-8 .txt is supported): ${doc.path}`);
    let bytes: Buffer;
    try { bytes = await readFile(resolve(dirname(inputPath), doc.path)); }
    catch (error) { throw new Error(`Cannot read ${doc.path}: ${String(error)}`); }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.trim()) throw new Error(`Empty research document: ${doc.path}`);
    const digest = sha256(bytes);
    const docId = sha256(JSON.stringify({ path: doc.path, digest, title: doc.title }));
    if (inputs.some(item => item.id === docId)) throw new Error(`Duplicate research document: ${doc.path}`);
    inputs.push({ id: docId, sha256: digest });
    for (const [chunkIndex, chunkText] of chunkResearchText(text).entries()) {
      const vector = embed(chunkText);
      if (!vector.length) throw new Error(`Document ${doc.path} chunk ${chunkIndex} contains no indexable text`);
      chunks.push({ id: sha256(`${docId}:${chunkIndex}:${chunkText}`), documentId: docId, chunkIndex, text: chunkText, vector, sourceTitle: doc.title, citation: doc.citation ?? null, publisher: doc.publisher ?? null, publishedAt: doc.publishedAt ?? null, sourceType: doc.sourceType, section: doc.section ?? "Research document", page: doc.page ?? null, roles: doc.roles ?? [], dimensionId: doc.dimensionId, subDimensionId: doc.subDimensionId });
    }
  }
  let gitCommit = "unavailable";
  try { gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* Build is valid outside a git checkout. */ }
  const require = createRequire(import.meta.url);
  const artifact = validateArtifact({ manifest: { schemaVersion: 1, model: MODEL, modelRevision: "1", dimensions: DIMENSIONS, normalization: "l2", similarity: "cosine", preprocessing: "unicode-nfkc-lowercase-word-v1", chunking: { sizeWords: 450, strideWords: 350 }, documentCount: inputs.length, chunkCount: chunks.length, inputs, nodeVersion: process.version, packageVersions: { node: process.version, zod: require("zod/package.json").version }, builtAt: new Date().toISOString(), gitCommit }, chunks });
  const temporary = `${outputPath}.${randomUUID()}.tmp`;
  let created = false;
  try {
    const file = await open(temporary, "wx", 0o600); created = true;
    try { await file.writeFile(JSON.stringify(artifact)); await file.sync(); } finally { await file.close(); }
    // An atomic hard link prevents accidentally replacing or merging an existing index.
    await link(temporary, outputPath);
  } finally { if (created) await unlink(temporary); }
  return artifact.manifest;
}
