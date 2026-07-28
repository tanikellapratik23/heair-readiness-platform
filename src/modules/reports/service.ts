import { RecommendationCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ScoringService } from "../scoring/service.js";
import { generateAiSummary } from "../recommendations/anthropic.js";

const actions: Record<string, string> = {
  policy_compliance: "Review and communicate clear AI policy guidance, including academic-integrity expectations and escalation paths.",
  ai_governance_access: "Publish a simple, equitable process for requesting, reviewing, and accessing approved AI tools.",
  leadership_resourcing: "Assign accountable leadership and fund a time-bound AI readiness improvement plan.",
  monitoring_evaluation: "Establish regular measures for AI adoption, risk, outcomes, and stakeholder feedback.",
  infrastructure_privacy_security: "Review approved AI tools against privacy, security, accessibility, and data-protection requirements.",
  data: "Document data ownership, quality, access controls, and permissible AI data flows.",
  ai_integration_use_cases: "Prioritize a small set of well-governed AI use cases with measurable learner or operational value.",
  trust_transparency: "Explain where AI is used, what it does, its limitations, and how people can challenge decisions.",
  ethics_responsible_use: "Provide practical responsible-AI guidance and scenario-based ethics training for this role.",
  stakeholder_engagement_awareness: "Create recurring channels for stakeholder input, communication, and awareness-building.",
  ai_literacy: "Offer role-relevant AI literacy learning covering capabilities, limitations, risks, and verification.",
  expertise_development: "Create advanced learning pathways, communities of practice, and applied support for AI expertise."
};

export class ReportService {
  static async generate(sessionId: string, force = false) {
    const existing = await prisma.readinessReport.findUnique({ where: { sessionId }, include: { recommendations: true } });
    if (existing && !force) return existing;
    const session = await prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: {
        user: { include: { department: true } },
        scoreResult: {
          include: {
            dimensionScores: { include: { dimension: true } },
            subDimensionScores: { include: { subDimension: true } }
          }
        }
      }
    });
    if (!session || session.status !== "completed") throw new Error("Complete the assessment before generating a report.");
    const score = session.scoreResult ?? await ScoringService.scoreSession(sessionId);
    const subScores = [...score.subDimensionScores].sort((a, b) => Number(a.score) - Number(b.score));
    const weak = subScores.slice(0, 3), strong = subScores.slice(-3).reverse();
    const deterministicSummary = `Your HEAIR readiness score is ${Number(score.overallScore).toFixed(1)}/100. Prioritize ${weak.map((x) => x.subDimension.label).join(", ")}; build on strengths in ${strong.map((x) => x.subDimension.label).join(", ")}.`;
    const summary = process.env.ANTHROPIC_API_KEY
      ? await generateAiSummary(session.roleAtTime, Number(score.overallScore), weak.map((x) => ({ subDimension: x.subDimension.label, score: Number(x.score) })), strong.map((x) => ({ subDimension: x.subDimension.label, score: Number(x.score) })))
      : deterministicSummary;
    const recommendations = [
      ...strong.map((x, i) => ({ category: "strength" as RecommendationCategory, subDimensionId: x.subDimensionId, title: `${x.subDimension.label} is a relative strength`, description: `Your score of ${Number(x.score).toFixed(0)} indicates a strong foundation. Sustain it while sharing effective practices.`, supportingCitationIds: [], sortOrder: i + 1 })),
      ...weak.map((x, i) => ({ category: "weakness" as RecommendationCategory, subDimensionId: x.subDimensionId, title: `${x.subDimension.label} needs attention`, description: `Your score of ${Number(x.score).toFixed(0)} is one of your lowest readiness indicators.`, supportingCitationIds: [], sortOrder: i + 1 })),
      ...weak.map((x, i) => ({ category: "priority_action" as RecommendationCategory, subDimensionId: x.subDimensionId, title: `Improve ${x.subDimension.label}`, description: actions[x.subDimensionId] ?? "Create a focused improvement action for this HEAIR sub-dimension.", supportingCitationIds: [], sortOrder: i + 1 }))
    ];
    return prisma.readinessReport.upsert({ where: { sessionId }, update: { overallScore: score.overallScore, summaryText: summary, generatedAt: new Date(), recommendations: { deleteMany: {}, create: recommendations } }, create: { sessionId, overallScore: score.overallScore, summaryText: summary, recommendations: { create: recommendations } }, include: { recommendations: { include: { subDimension: true }, orderBy: { sortOrder: "asc" } } } });
  }
}
