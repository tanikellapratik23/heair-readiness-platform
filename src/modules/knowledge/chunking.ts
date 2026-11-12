/** Shared, deterministic chunking for the database-backed HEARMES research corpus. */
export function chunkResearchText(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let start = 0; start < words.length; start += 350) {
    const chunk = words.slice(start, start + 450).join(" ");
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}
