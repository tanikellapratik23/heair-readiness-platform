import "dotenv/config";
import { readFile } from "node:fs/promises";
import {
  FULL_HEAIR_PAPER_CITATION,
  FULL_HEAIR_PAPER_DOCUMENT_ID,
  FULL_HEAIR_PAPER_TITLE,
  prepareFullHeairPaper
} from "../src/modules/knowledge/full-paper-import.js";

const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : undefined;
const dryRun = args.includes("--dry-run");

if (!inputPath || inputIndex + 1 >= args.length || args.some((arg, index) => arg !== "--input" && arg !== "--dry-run" && index !== inputIndex + 1)) {
  throw new Error("Usage: npm run knowledge:import:heair-paper -- --input /absolute/path/heair-pages.json [--dry-run]");
}

const source = prepareFullHeairPaper(JSON.parse(await readFile(inputPath, "utf8")));
const summary = { title: FULL_HEAIR_PAPER_TITLE, pages: source.pages.length, chunks: source.chunks.length, documentId: FULL_HEAIR_PAPER_DOCUMENT_ID, dryRun };

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
