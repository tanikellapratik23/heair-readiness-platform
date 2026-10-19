import { loadArtifact } from "../src/modules/knowledge/artifact.js";
import { retrieveArtifactContext } from "../src/modules/knowledge/retrieval.js";
const [path, query, ...options] = process.argv.slice(2);
const roleIndex = options.indexOf("--role");
const role = roleIndex < 0 ? "student" : options[roleIndex + 1];
const roles = ["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff", "administrator_leadership", "it_staff", "academic_business_affairs_staff"];
const unknownOptions = options.some((value, i) => value !== "--role" && value !== "--show-passages" && !(roleIndex >= 0 && i === roleIndex + 1));
if (!path || !query || !role || !roles.includes(role) || unknownOptions || options.filter(o => o === "--role").length > 1) { console.error('Usage: npm run research:verify -- /path/artifact.json "query" [--role student|faculty|executive_leadership|administrative_staff|programming_staff|finance_staff] [--show-passages]'); process.exit(1); }
try {
  const artifact = loadArtifact(path);
  const results = retrieveArtifactContext(artifact, role, [], 3, query);
  console.log(JSON.stringify({ manifest: artifact.manifest, role, sources: results.map(({ sourceTitle, section, citation, text }) => ({ sourceTitle, section, citation, ...(options.includes("--show-passages") ? { text } : {}) })) }, null, 2));
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
