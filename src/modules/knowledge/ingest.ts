import { prisma } from "../../lib/prisma.js";

/** Basic ingestion path. Add embeddings with the provider of your choice and update the vector column using raw SQL. */
export async function ingestKnowledge(input: { title: string; sourceType: "heair_paper" | "framework" | "research_paper" | "best_practice"; citation?: string; text: string; metadata?: Record<string, string> }) {
  const document = await prisma.knowledgeDocument.create({ data: { sourceTitle: input.title, sourceType: input.sourceType, sourceUrlOrCitation: input.citation, rawText: input.text } });
  const words = input.text.split(/\s+/); const chunks: string[] = [];
  for (let start = 0; start < words.length; start += 350) chunks.push(words.slice(start, start + 450).join(" "));
  await prisma.knowledgeChunk.createMany({ data: chunks.map((chunkText, chunkIndex) => ({ documentId: document.id, chunkText, chunkIndex, metadata: input.metadata ?? {} })) });
  return document;
}
