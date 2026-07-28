const fallback = "AI enhancement is not configured. Your report uses the HEAIR scoring and recommendations engine.";

type Score = { subDimension: string; score: number };
export type PublicReadinessScore = Score & { dimension: string };
export type PublicAiReport = {
  stage: string;
  headline: string;
  summary: string;
  strengths: Array<{ title: string; score: number; description: string }>;
  priorities: Array<{ title: string; score: number; description: string; actions: string[] }>;
};

function fallbackReport(overallScore: number, scores: PublicReadinessScore[]): PublicAiReport {
  const ordered = [...scores].sort((a, b) => a.score - b.score);
  const weakest = ordered.slice(0, 3), strongest = ordered.slice(-3).reverse();
  const stage = overallScore < 40 ? "Early development" : overallScore < 60 ? "Developing" : overallScore < 80 ? "Established" : "Leading";
  return {
    stage,
    headline: `${stage} AI readiness`,
    summary: `Build from your strongest capabilities while focusing first on the three lowest-scoring readiness areas below.`,
    strengths: strongest.map((item) => ({ title: item.subDimension, score: item.score, description: `This is a relative strength to sustain and share with peers.` })),
    priorities: weakest.map((item) => ({ title: item.subDimension, score: item.score, description: `This is a priority area for focused improvement.`, actions: ["Set one small, role-relevant goal for the next 30 days.", "Use approved institutional guidance and support resources."] }))
  };
}

export async function generateAiSummary(role: string, overallScore: number, weakest: Score[], strongest: Score[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 300,
      system: "You are a higher-education AI readiness advisor. Give a concise, practical, evidence-aware report. Do not invent citations or claim access to institutional data.",
      messages: [{ role: "user", content: JSON.stringify({ role, overallScore, weakest, strongest }) }]
    })
  });
  if (!response.ok) throw new Error(`Anthropic request failed with status ${response.status}.`);
  const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
  const text = body.content?.find((part) => part.type === "text")?.text?.trim();
  return text || fallback;
}

export async function generatePublicAiReport(role: string, overallScore: number, scores: PublicReadinessScore[]): Promise<PublicAiReport> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackReport(overallScore, scores);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 700,
      system: "You are a practical higher-education AI readiness advisor. Use only the scores supplied. Return raw JSON only: no Markdown, code fences, citations, or introductory text. Keep every description to 24 words or fewer and every action to 16 words or fewer. Be specific, encouraging, and role-aware.",
      messages: [{ role: "user", content: JSON.stringify({
        role, overallScore, scores,
        requiredShape: {
          stage: "Early development | Developing | Established | Leading",
          headline: "short positive title",
          summary: "two concise sentences",
          strengths: [{ title: "score name", score: 0, description: "why this is useful" }],
          priorities: [{ title: "score name", score: 0, description: "what this gap means", actions: ["concrete next step", "concrete next step"] }]
        },
        instructions: "Return exactly 2 strengths and exactly 3 priorities. Use only supplied score names and numeric values."
      }) }]
    })
  });
  if (!response.ok) throw new Error(`Anthropic request failed with status ${response.status}.`);
  const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
  const text = body.content?.find((part) => part.type === "text")?.text?.trim();
  if (!text) return fallbackReport(overallScore, scores);
  try {
    const parsed = JSON.parse(text) as PublicAiReport;
    if (!parsed.stage || !parsed.headline || !parsed.summary || !Array.isArray(parsed.strengths) || !Array.isArray(parsed.priorities)) return fallbackReport(overallScore, scores);
    return parsed;
  } catch { return fallbackReport(overallScore, scores); }
}
