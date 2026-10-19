import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildArtifact } from "./artifact-build.js";
import { getResearchArtifact, initializeResearchArtifact, loadArtifact, validateArtifact } from "./artifact.js";
import { retrieveArtifactContext, retrieveHeairContext } from "./retrieval.js";
import { prisma } from "../../lib/prisma.js";

describe("optional research artifact", () => {
  const dirs: string[] = [];
  afterEach(async () => { vi.restoreAllMocks(); delete process.env.HEAIR_RETRIEVAL_ARTIFACT_PATH; initializeResearchArtifact(); for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
  async function fixture() {
    const dir = await mkdtemp(join(tmpdir(), "hearmes-artifact-test-")); dirs.push(dir);
    await writeFile(join(dir, "privacy.txt"), "Student privacy requires protecting student data and reviewing data retention policies.");
    await writeFile(join(dir, "training.txt"), "Faculty learning workshops build teaching skills and knowledge of responsible technology.");
    const input = join(dir, "documents.json"), output = join(dir, "research.artifact.json");
    await writeFile(input, JSON.stringify({ documents: [
      { path: "privacy.txt", title: "Privacy research", sourceType: "heair_paper", citation: "https://example.org/privacy", publisher: "Example University", section: "Privacy", page: "7", roles: ["student"] },
      { path: "training.txt", title: "Training research", sourceType: "research_paper", section: "Teaching" }
    ] }));
    return { dir, input, output };
  }
  it("builds, loads, retrieves and retains citation metadata with stable IDs", async () => {
    const { dir, input, output } = await fixture();
    const manifest = await buildArtifact(input, output);
    expect(manifest.documentCount).toBe(2); expect(manifest.chunkCount).toBe(2);
    const artifact = loadArtifact(output);
    const result = retrieveArtifactContext(artifact, "student", [], 1, "student privacy data");
    expect(result[0]).toMatchObject({ sourceTitle: "Privacy research", citation: "https://example.org/privacy", publisher: "Example University", section: "Privacy, page 7" });
    const second = join(dir, "second.artifact.json"); await buildArtifact(input, second);
    expect(loadArtifact(second).chunks.map(c => c.id)).toEqual(artifact.chunks.map(c => c.id));
    await expect(buildArtifact(input, output)).rejects.toThrow();
    expect(loadArtifact(output).chunks).toEqual(artifact.chunks);
    process.env.HEAIR_RETRIEVAL_ARTIFACT_PATH = output; initializeResearchArtifact(); expect(getResearchArtifact()?.chunks).toHaveLength(2);
    delete process.env.HEAIR_RETRIEVAL_ARTIFACT_PATH; initializeResearchArtifact(); expect(getResearchArtifact()).toBeUndefined();
  });
  it("rejects incompatible models, corrupt vectors, and missing or empty inputs", async () => {
    const { dir, input, output } = await fixture(); await buildArtifact(input, output);
    const data = JSON.parse(await readFile(output, "utf8"));
    expect(() => validateArtifact({ ...data, manifest: { ...data.manifest, dimensions: 1536 } })).toThrow(/incompatible/);
    expect(() => validateArtifact({ ...data, manifest: { ...data.manifest, model: "another-model" } })).toThrow(/incompatible/);
    data.chunks[0].vector = []; expect(() => validateArtifact(data)).toThrow(/embedding mismatch/);
    await writeFile(join(dir, "privacy.txt"), "  "); await expect(buildArtifact(input, join(dir, "empty.json"))).rejects.toThrow(/Empty/);
    await writeFile(input, JSON.stringify({ documents: [{ path: "missing.txt", title: "Missing", sourceType: "heair_paper" }] }));
    await expect(buildArtifact(input, join(dir, "missing.json"))).rejects.toThrow(/Cannot read/);
  });
  it("retains the database retrieval path when not configured", async () => {
    const find = vi.spyOn(prisma.knowledgeChunk, "findMany").mockResolvedValue([{ id: "one", chunkIndex: 0, chunkText: "Student privacy guidance", metadata: { roles: ["student"] }, document: { sourceTitle: "Database paper", sourceUrlOrCitation: "source", publisher: null, publishedAt: null, sourceType: "heair_paper" } }] as never);
    expect(await retrieveHeairContext("student", [], 1, "privacy")).toMatchObject([{ sourceTitle: "Database paper", citation: "source" }]);
    expect(find).toHaveBeenCalled();
  });
  it("uses the existing 450 word chunk and 350 word stride", async () => {
    const { dir, input, output } = await fixture();
    await writeFile(join(dir, "privacy.txt"), Array.from({ length: 451 }, (_, i) => `word${i}`).join(" "));
    await buildArtifact(input, output);
    const chunks = loadArtifact(output).chunks.filter(c => c.sourceTitle === "Privacy research");
    expect(chunks).toHaveLength(2);
    expect(chunks[0].text.split(" ")).toHaveLength(450);
    expect(chunks[1].text.split(" ")[0]).toBe("word350");
  });
});
