import "dotenv/config";
import { readFile } from "node:fs/promises";
import { parseResearchPaperArtifact } from "../src/modules/knowledge/research-paper-artifact.js";

const args = process.argv.slice(2);
const artifactIndex = args.indexOf("--artifact");
const artifactPath = artifactIndex >= 0 ? args[artifactIndex + 1] : undefined;
const dryRun = args.includes("--dry-run");
if (!artifactPath || artifactIndex + 1 >= args.length || args.some((arg, index) => arg !== "--artifact" && arg !== "--dry-run" && index !== artifactIndex + 1)) {
  throw new Error("Usage: npm run knowledge:import:research-paper -- --artifact /absolute/paper.artifact.json [--dry-run]");
}

const artifact = parseResearchPaperArtifact(JSON.parse(await readFile(artifactPath, "utf8")));
const summary = { title: artifact.source.title, citation: artifact.source.citation, sourceType: artifact.source.sourceType, pages: artifact.source.pageCount, chunks: artifact.chunks.length, documentId: artifact.source.documentId, input: "validated-orion-artifact", dryRun };
if (dryRun) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const { prisma } = await import("../src/lib/prisma.js");
  await prisma.$transaction(async (tx) => {
    await tx.knowledgeDocument.upsert({
      where: { id: artifact.source.documentId },
      update: { sourceTitle: artifact.source.title, sourceType: artifact.source.sourceType, sourceUrlOrCitation: artifact.source.citation, rawText: artifact.pages.map((page) => page.text).join("\n\n") },
      create: { id: artifact.source.documentId, sourceTitle: artifact.source.title, sourceType: artifact.source.sourceType, sourceUrlOrCitation: artifact.source.citation, rawText: artifact.pages.map((page) => page.text).join("\n\n") }
    });
    await tx.knowledgeChunk.deleteMany({ where: { documentId: artifact.source.documentId } });
    await tx.knowledgeChunk.createMany({ data: artifact.chunks.map((chunk) => ({ documentId: artifact.source.documentId, chunkText: chunk.chunkText, chunkIndex: chunk.chunkIndex, metadata: chunk.metadata })) });
  });
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}
