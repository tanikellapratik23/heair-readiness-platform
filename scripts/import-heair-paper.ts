import "dotenv/config";
import { readFile } from "node:fs/promises";
import {
  FULL_HEAIR_PAPER_CITATION,
  FULL_HEAIR_PAPER_DOCUMENT_ID,
  FULL_HEAIR_PAPER_TITLE,
  prepareFullHeairPaper
} from "../src/modules/knowledge/full-paper-import.js";
import { parseFullHeairPaperArtifact } from "../src/modules/knowledge/full-paper-artifact.js";

const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const artifactIndex = args.indexOf("--artifact");
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : undefined;
const artifactPath = artifactIndex >= 0 ? args[artifactIndex + 1] : undefined;
const dryRun = args.includes("--dry-run");

if ((Boolean(inputPath) === Boolean(artifactPath)) || (inputPath && inputIndex + 1 >= args.length) || (artifactPath && artifactIndex + 1 >= args.length) || args.some((arg, index) => arg !== "--input" && arg !== "--artifact" && arg !== "--dry-run" && index !== inputIndex + 1 && index !== artifactIndex + 1)) {
  throw new Error("Usage: npm run knowledge:import:heair-paper -- (--input /absolute/heair-pages.json | --artifact /absolute/heair-paper.artifact.json) [--dry-run]");
}

const raw = JSON.parse(await readFile((artifactPath || inputPath)!, "utf8"));
const source = artifactPath ? parseFullHeairPaperArtifact(raw) : prepareFullHeairPaper(raw);
const summary = { title: FULL_HEAIR_PAPER_TITLE, pages: source.pages.length, chunks: source.chunks.length, documentId: FULL_HEAIR_PAPER_DOCUMENT_ID, input: artifactPath ? "validated-orion-artifact" : "raw-pages", dryRun };

if (dryRun) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const { prisma } = await import("../src/lib/prisma.js");
  await prisma.$transaction(async (tx) => {
    await tx.knowledgeDocument.upsert({
      where: { id: FULL_HEAIR_PAPER_DOCUMENT_ID },
      update: {
        sourceTitle: FULL_HEAIR_PAPER_TITLE,
        sourceType: "heair_paper",
        sourceUrlOrCitation: FULL_HEAIR_PAPER_CITATION,
        rawText: source.pages.map((page) => page.text).join("\n\n")
      },
      create: {
        id: FULL_HEAIR_PAPER_DOCUMENT_ID,
        sourceTitle: FULL_HEAIR_PAPER_TITLE,
        sourceType: "heair_paper",
        sourceUrlOrCitation: FULL_HEAIR_PAPER_CITATION,
        rawText: source.pages.map((page) => page.text).join("\n\n")
      }
    });
    await tx.knowledgeChunk.deleteMany({ where: { documentId: FULL_HEAIR_PAPER_DOCUMENT_ID } });
    await tx.knowledgeChunk.createMany({
      data: source.chunks.map((chunk) => ({
        documentId: FULL_HEAIR_PAPER_DOCUMENT_ID,
        chunkText: chunk.chunkText,
        chunkIndex: chunk.chunkIndex,
        metadata: chunk.metadata
      }))
    });
  });
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}
