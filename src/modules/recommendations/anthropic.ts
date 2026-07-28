const fallback = "AI enhancement is not configured. Your report uses the HEAIR scoring and recommendations engine.";

type Score = { subDimension: string; score: number };

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
