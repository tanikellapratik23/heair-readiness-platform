import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { buildResearchPaperArtifact, sha256 } from "../src/modules/knowledge/research-paper-artifact.js";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const readArg = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const inputPath = readArg("--input");
const outputPath = readArg("--output");
const title = readArg("--title");
const citation = readArg("--citation");
const sourceType = readArg("--source-type");
if (!inputPath || !outputPath || !title || !citation || !sourceType || args.length !== 10) {
  throw new Error("Usage: npm run knowledge:build:research-paper-artifact -- --input /absolute/pages.json --output /absolute/paper.artifact.json --title 'Paper title' --citation 'Citation' --source-type research_paper");
}

async function currentGitCommit() {
  try { return (await execFileAsync("git", ["rev-parse", "HEAD"])).stdout.trim(); } catch { return "unknown"; }
}

const input = await readFile(inputPath, "utf8");
const parsed = JSON.parse(input) as { pages: unknown };
const artifact = buildResearchPaperArtifact({
  pages: parsed.pages,
  title,
  citation,
  sourceType: sourceType as "research_paper" | "best_practice",
  inputSha256: sha256(input),
  gitCommit: await currentGitCommit()
});
const resolvedOutput = resolve(outputPath);
await mkdir(dirname(resolvedOutput), { recursive: true });
const temporaryOutput = `${resolvedOutput}.tmp-${process.pid}`;
await writeFile(temporaryOutput, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
await rename(temporaryOutput, resolvedOutput);
console.log(JSON.stringify({ output: resolvedOutput, title: artifact.source.title, sourceType: artifact.source.sourceType, pages: artifact.source.pageCount, chunks: artifact.chunks.length, integritySha256: artifact.integritySha256 }, null, 2));
