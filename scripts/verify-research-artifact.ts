import { loadArtifact } from "../src/modules/knowledge/artifact.js";
import { retrieveArtifactContext } from "../src/modules/knowledge/retrieval.js";
const [path, query] = process.argv.slice(2);
if (!path || !query) { console.error('Usage: npm run research:verify -- /path/artifact.json "query"'); process.exit(1); }
try {
  const artifact = loadArtifact(path);
  const results = retrieveArtifactContext(artifact, "student", [], 3, query);
  console.log(JSON.stringify({ manifest: artifact.manifest, sources: results.map(({ sourceTitle, section, citation }) => ({ sourceTitle, section, citation })) }, null, 2));
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
