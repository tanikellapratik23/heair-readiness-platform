import { prisma } from "../../lib/prisma.js";
import { HEAIR_SOURCE_TITLE } from "./heair-framework.js";

type Score = { subDimension: string; dimension: string; score: number };
type ChunkMetadata = { kind?: string; dimensionId?: string; subDimensionId?: string; roles?: string[] };

const subDimensionIds: Record<string, string> = {
  "Policy & Compliance": "policy_compliance", "AI Governance & Access": "ai_governance_access", "Leadership & Resourcing": "leadership_resourcing", "Monitoring & Evaluation": "monitoring_evaluation",
  "Infrastructure, Privacy & Security": "infrastructure_privacy_security", Data: "data", "AI Integration & Use Cases": "ai_integration_use_cases",
  "Trust & Transparency": "trust_transparency", "Ethics & Responsible Use": "ethics_responsible_use", "Stakeholder Engagement & Awareness": "stakeholder_engagement_awareness",
  "AI Literacy": "ai_literacy", "Expertise Development": "expertise_development"
};
const dimensionIds: Record<string, string> = { "Governance & Strategy": "governance_strategy", "Systems & Infrastructure": "systems_infrastructure", Culture: "culture", Education: "education" };
const subDimensionLabels: Record<string, string> = Object.fromEntries(Object.entries(subDimensionIds).map(([label, id]) => [id, label]));
const ignoredQueryTerms = new Set(["about", "after", "against", "could", "first", "focus", "from", "have", "help", "into", "more", "overall", "should", "score", "scores", "their", "there", "these", "this", "what", "when", "which", "with", "would", "your"]);

function queryTerms(question: string) {
  return [...new Set((question.toLocaleLowerCase().match(/[a-z]{3,}/g) ?? []).filter((term) => !ignoredQueryTerms.has(term)))].slice(0, 12);
}

/**
 * Metadata-ranked RAG retrieval. The initial corpus is compact and deliberately
 * uses framework labels rather than an additional paid embedding provider.
 */
export async function retrieveHeairContext(role: string, scores: Score[], limit = 6, question = "") {
  try {
    const chunks = await prisma.knowledgeChunk.findMany({
      where: { document: { sourceType: "heair_paper" } },
      include: { document: { select: { sourceTitle: true, sourceUrlOrCitation: true } } }
    });
    const weakest = [...scores].sort((left, right) => left.score - right.score).slice(0, 3);
    const weakSubDimensions = new Set(weakest.map((score) => subDimensionIds[score.subDimension]).filter(Boolean));
    const weakDimensions = new Set(weakest.map((score) => dimensionIds[score.dimension]).filter(Boolean));
    const terms = queryTerms(question);
    const roleTerms = role === "business_affairs" ? ["business affairs", "business"] : [role.replace(/_/g, " ")];
    const framework = chunks.filter((chunk) => (chunk.metadata as ChunkMetadata | null)?.kind === "framework").slice(0, 1);
    const ranked = chunks
      .filter((chunk) => !framework.some((frameworkChunk) => frameworkChunk.id === chunk.id))
      .map((chunk) => {
        const metadata = (chunk.metadata ?? {}) as ChunkMetadata;
        let rank = metadata.roles?.includes(role) ? 2 : 0;
        if (metadata.subDimensionId && weakSubDimensions.has(metadata.subDimensionId)) rank += 10;
        if (metadata.dimensionId && weakDimensions.has(metadata.dimensionId)) rank += 3;
        const chunkText = chunk.chunkText.toLocaleLowerCase();
        if (roleTerms.some((term) => chunkText.includes(term))) rank += 3;
        rank += Math.min(8, terms.reduce((total, term) => total + (chunkText.includes(term) ? 2 : 0), 0));
        return { chunk, rank };
      })
      .sort((left, right) => right.rank - left.rank || left.chunk.chunkIndex - right.chunk.chunkIndex)
      .slice(0, limit);
    return [...framework, ...ranked.map((item) => item.chunk)].map((chunk) => ({
      sourceTitle: chunk.document.sourceTitle || HEAIR_SOURCE_TITLE,
      citation: chunk.document.sourceUrlOrCitation,
      section: ((chunk.metadata as ChunkMetadata | null)?.subDimensionId && subDimensionLabels[(chunk.metadata as ChunkMetadata).subDimensionId!]) || "HEAIR framework",
      text: chunk.chunkText
    }));
  } catch {
    // Reports remain available while a database is being provisioned or repaired.
    return [];
  }
}

export function formatHeairContext(context: Awaited<ReturnType<typeof retrieveHeairContext>>) {
  if (!context.length) return "No HEAIR source chunks were retrieved. Use only the supplied score profile and avoid unsupported claims.";
  return context.map((chunk, index) => `[HEAIR source ${index + 1}: ${chunk.sourceTitle}${chunk.citation ? ` — ${chunk.citation}` : ""}]\n${chunk.text}`).join("\n\n");
}
