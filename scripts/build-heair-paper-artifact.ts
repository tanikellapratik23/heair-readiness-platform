import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { buildFullHeairPaperArtifact, sha256 } from "../src/modules/knowledge/full-paper-artifact.js";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const outputIndex = args.indexOf("--output");
const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : undefined;
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;

if (!inputPath || !outputPath || inputIndex + 1 >= args.length || outputIndex + 1 >= args.length || args.length !== 4) {
  throw new Error("Usage: npm run knowledge:build:heair-paper-artifact -- --input /absolute/heair-pages.json --output /absolute/heair-paper.artifact.json");
}

async function currentGitCommit(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"]);
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

const input = await readFile(inputPath, "utf8");
const artifact = buildFullHeairPaperArtifact(JSON.parse(input), sha256(input), await currentGitCommit());
const resolvedOutput = resolve(outputPath);
await mkdir(dirname(resolvedOutput), { recursive: true });
const temporaryOutput = `${resolvedOutput}.tmp-${process.pid}`;
await writeFile(temporaryOutput, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
await rename(temporaryOutput, resolvedOutput);

console.log(JSON.stringify({
  output: resolvedOutput,
  schemaVersion: artifact.schemaVersion,
  inputSha256: artifact.source.inputSha256,
  pages: artifact.source.pageCount,
  chunks: artifact.chunks.length,
  integritySha256: artifact.integritySha256,
  gitCommit: artifact.gitCommit
}, null, 2));
