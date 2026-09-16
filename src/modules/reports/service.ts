import { RecommendationCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { ScoringService } from "../scoring/service.js";
import { generateAiSummary } from "../recommendations/anthropic.js";
import { METHODOLOGY_VERSION } from "../../lib/assessment-methodology.js";
import { HEAIR_DOCUMENT_ID } from "../knowledge/heair-framework.js";

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
    // These are response-anchor rules, not maturity cutoffs. A subdimension is
    // a supported strength only at "Consistently applied" or higher; an
    // opportunity is surfaced only at or below "Partially established".
    const weak = subScores.filter((item) => Number(item.score) <= 50).slice(0, 3);
    const strong = subScores.filter((item) => Number(item.score) >= 75).slice(-3).reverse();
    const focusText = weak.length ? `Focus first on ${weak.map((x) => x.subDimension.label).join(", ")}` : "No automatic priority was identified from the response anchors";
    const deterministicSummary = `Your Project HEARMES readiness result is ${Number(score.overallScore).toFixed(1)}/100 based on ${score.scoredResponseCount} scored responses. ${focusText}${strong.length ? ` while maintaining ${strong.map((x) => x.subDimension.label).join(", ")}` : ""}.`;
    const summary = process.env.ANTHROPIC_API_KEY
      ? await generateAiSummary(session.roleAtTime, Number(score.overallScore), weak.map((x) => ({ subDimension: x.subDimension.label, score: Number(x.score) })), strong.map((x) => ({ subDimension: x.subDimension.label, score: Number(x.score) })))
      : deterministicSummary;
    const recommendations = [
      ...strong.map((x, i) => ({ category: "strength" as RecommendationCategory, subDimensionId: x.subDimensionId, title: `${x.subDimension.label} is a supported strength`, description: `A score of ${Number(x.score).toFixed(0)} is comparatively strong within this assessment. Maintain this practice and share it through appropriate role-specific channels.`, supportingCitationIds: [HEAIR_DOCUMENT_ID], sortOrder: i + 1 })),
      ...weak.map((x, i) => ({ category: "weakness" as RecommendationCategory, subDimensionId: x.subDimensionId, title: `${x.subDimension.label} is an opportunity`, description: `A score of ${Number(x.score).toFixed(0)} is among the lower scored readiness indicators in this assessment.`, supportingCitationIds: [HEAIR_DOCUMENT_ID], sortOrder: i + 1 })),
      ...weak.map((x, i) => ({ category: "priority_action" as RecommendationCategory, subDimensionId: x.subDimensionId, title: `Improve ${x.subDimension.label}`, description: actions[x.subDimensionId] ?? "Create a focused improvement action for this Project HEARMES sub-dimension.", supportingCitationIds: [HEAIR_DOCUMENT_ID], sortOrder: i + 1 }))
    ];
    const structuredData = { methodologyVersion: score.methodologyVersion || METHODOLOGY_VERSION, responseCoverage: { scoredResponseCount: score.scoredResponseCount, excludedResponseCount: score.excludedResponseCount, responseCoveragePercent: score.responseCoveragePercent }, maturityThresholds: "requires_research_team_approval" };
    return prisma.readinessReport.upsert({ where: { sessionId }, update: { overallScore: score.overallScore, summaryText: summary, structuredData, generatedAt: new Date(), recommendations: { deleteMany: {}, create: recommendations } }, create: { sessionId, overallScore: score.overallScore, summaryText: summary, structuredData, recommendations: { create: recommendations } }, include: { recommendations: { include: { subDimension: true }, orderBy: { sortOrder: "asc" } } } });
  }
}
