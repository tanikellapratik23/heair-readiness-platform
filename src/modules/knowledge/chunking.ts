/** Shared with the existing database ingestion path. */
export function chunkResearchText(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let start = 0; start < words.length; start += 350) chunks.push(words.slice(start, start + 450).join(" "));
  return chunks;
}
