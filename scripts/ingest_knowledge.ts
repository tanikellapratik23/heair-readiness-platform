import { readFile } from "node:fs/promises";
import { ingestKnowledge } from "../src/modules/knowledge/ingest.js";
import { prisma } from "../src/lib/prisma.js";

const path = process.argv[2];
if (!path) throw new Error("Usage: tsx scripts/ingest_knowledge.ts <text-file>");
const text = await readFile(path, "utf8");
await ingestKnowledge({ title: "HEAIR Framework Paper", sourceType: "heair_paper", citation: "Tadimalla & Maher (2026)", text });
await prisma.$disconnect();
