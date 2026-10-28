import { buildArtifact } from "../src/modules/knowledge/artifact-build.js";

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--input" || args[2] !== "--output") {
  console.error("Usage: npm run research:build -- --input /path/documents.json --output /path/new-artifact.json");
  process.exit(1);
}
try {
  const manifest = await buildArtifact(args[1], args[3]);
  console.log(JSON.stringify(manifest, null, 2));
} catch (error) {
  console.error(`Research ingestion failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
