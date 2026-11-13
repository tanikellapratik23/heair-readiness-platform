import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import Fastify from "fastify";

/**
 * A localhost-only publishing console for the approved HEAIR paper workflow.
 * It intentionally delegates VPN and Duo authentication to Cisco Secure Client
 * and the system ssh client; credentials never enter the browser or this process.
 */

const execFileAsync = promisify(execFile);
const app = Fastify({ logger: false, bodyLimit: 15 * 1024 * 1024 });
const host = "hpc.charlotte.edu";
const root = join(tmpdir(), "hearmes-research-publisher");
const socketPath = process.env.HEARMES_ORION_SOCKET || join(homedir(), ".ssh", "hearmes-orion.sock");
const maxPdfBytes = 12 * 1024 * 1024;

type JobStatus = "uploaded" | "submitted" | "running" | "completed" | "failed" | "ready_to_import" | "imported";
type PublishJob = {
  id: string;
  originalName: string;
  uploadedAt: string;
  pdfPath: string;
  sha256: string;
  size: number;
  status: JobStatus;
  detail: string;
  user?: string;
  remoteArtifact?: string;
  localArtifact?: string;
  slurmJobId?: string;
  artifactSummary?: { pages: number; chunks: number; integritySha256: string };
};

const jobs = new Map<string, PublishJob>();

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function validateUser(value: unknown): string {
  const user = String(value || "").trim();
  if (!/^[a-z][a-z0-9_-]{1,31}$/i.test(user)) {
    throw new Error("Enter your NinerNET username (letters, numbers, hyphens, or underscores only).");
  }
  return user;
}

function jobView(job: PublishJob) {
  const { pdfPath, localArtifact, ...safe } = job;
  return safe;
}

async function run(command: string, args: string[]) {
  try {
    return await execFileAsync(command, args, { maxBuffer: 1024 * 1024 });
  } catch (error) {
    const detail = error as { stderr?: string; stdout?: string; message?: string };
    throw new Error((detail.stderr || detail.stdout || detail.message || "Command failed").trim());
  }
}

function sshArgs(user: string, command: string): string[] {
  return ["-S", socketPath, "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", `${user}@${host}`, command];
}

async function checkConnection(user: string) {
  await access(socketPath);
  await run("ssh", sshArgs(user, "printf connected"));
}

async function importArtifact(job: PublishJob) {
  if (!job.localArtifact) throw new Error("The validated artifact has not been copied back from ORION yet.");
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not available to this local publisher. Close it, set DATABASE_URL in your terminal, and start it again. Never paste the database URL into the dashboard.");
  }
  const { stdout } = await run("npm", ["run", "knowledge:import:heair-paper", "--", "--artifact", job.localArtifact]);
  job.status = "imported";
  job.detail = "Imported into the live Coach retrieval database. Test a cited Coach question before relying on it.";
  return stdout;
}

async function retrieveCompletedArtifact(job: PublishJob) {
  if (!job.user || !job.remoteArtifact) throw new Error("This publish job is missing its ORION configuration.");
  const artifactPath = join(root, `${job.id}.artifact.json`);
  await run("scp", ["-o", `ControlPath=${socketPath}`, "-o", "BatchMode=yes", `${job.user}@${host}:${job.remoteArtifact}`, artifactPath]);
  const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
    source?: { pageCount?: number };
    chunks?: unknown[];
    integritySha256?: string;
  };
  if (!artifact.source?.pageCount || !Array.isArray(artifact.chunks) || !artifact.integritySha256) {
    throw new Error("ORION returned an artifact that did not pass the local integrity preflight.");
  }
  await run("npm", ["run", "knowledge:import:heair-paper", "--", "--artifact", artifactPath, "--dry-run"]);
  job.localArtifact = artifactPath;
  job.status = "ready_to_import";
  job.detail = "ORION completed the job. The artifact passed local validation and is ready for the explicit database import.";
  job.artifactSummary = { pages: artifact.source.pageCount, chunks: artifact.chunks.length, integritySha256: artifact.integritySha256 };
}

app.addContentTypeParser(/^application\/pdf(?:;.*)?$/i, { parseAs: "buffer" }, (_request, body, done) => done(null, body));

app.get("/api/connection", async (request) => {
  try {
    const user = validateUser((request.query as { user?: string }).user);
    await checkConnection(user);
    return { connected: true, message: `Secure ORION connection confirmed for ${user}.` };
  } catch (error) {
    return { connected: false, message: error instanceof Error ? error.message : "The secure ORION connection is unavailable." };
  }
});

app.post("/api/papers", async (request) => {
  const content = request.body as Buffer;
  if (!Buffer.isBuffer(content) || !content.length) throw new Error("Choose a non-empty PDF first.");
  if (content.length > maxPdfBytes) throw new Error("This local publisher accepts PDFs up to 12 MB.");
  const originalName = basename(String(request.headers["x-hearmes-file-name"] || "approved-heair-paper.pdf")).replace(/[^a-zA-Z0-9._ -]/g, "_");
  if (!originalName.toLowerCase().endsWith(".pdf")) throw new Error("Only PDF files are accepted by this HEAIR paper workflow.");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const id = randomUUID();
  const pdfPath = join(root, `${id}.pdf`);
  await writeFile(pdfPath, content, { mode: 0o600 });
  const job: PublishJob = {
    id,
    originalName,
    uploadedAt: new Date().toISOString(),
    pdfPath,
    sha256: createHash("sha256").update(content).digest("hex"),
    size: content.length,
    status: "uploaded",
    detail: "PDF held only in this computer's temporary local workspace. Review that it is an approved HEAIR paper before submitting it to ORION."
  };
  jobs.set(id, job);
  return jobView(job);
});

app.post("/api/jobs/:id/submit", async (request) => {
  const job = jobs.get((request.params as { id: string }).id);
  if (!job) throw new Error("This local publish session no longer exists. Upload the PDF again.");
  if (job.status !== "uploaded") throw new Error("This PDF has already been submitted. Refresh its status instead of submitting it again.");
  const user = validateUser((request.body as { user?: string }).user);
  await checkConnection(user);
  const repo = `/users/${user}/hearmes-orion`;
  const remoteInput = `/users/${user}/hearmes-inputs/heair-publisher-${job.id}.pdf`;
  const remoteArtifact = `/users/${user}/hearmes-artifacts/heair-publisher-${job.id}.artifact.json`;
  const remoteLog = `/users/${user}/hearmes-logs/heair-publisher-%j.out`;
  const remoteError = `/users/${user}/hearmes-logs/heair-publisher-%j.err`;
  await run("ssh", sshArgs(user, `mkdir -p ${quote(`/users/${user}/hearmes-inputs`)} ${quote(`/users/${user}/hearmes-artifacts`)} ${quote(`/users/${user}/hearmes-logs`)}`));
  await run("scp", ["-o", `ControlPath=${socketPath}`, "-o", "BatchMode=yes", job.pdfPath, `${user}@${host}:${remoteInput}`]);
  const command = [
    `cd ${quote(repo)}`,
    `export HEARMES_REPO=${quote(repo)} HEARMES_PDF=${quote(remoteInput)} HEARMES_OUTPUT=${quote(remoteArtifact)}`,
    `sbatch --partition=Orion --cpus-per-task=1 --mem=2G --time=00:10:00 --output=${quote(remoteLog)} --error=${quote(remoteError)} scripts/orion/build-heair-paper-artifact.slurm`
  ].join(" && ");
  const { stdout } = await run("ssh", sshArgs(user, command));
  const match = stdout.match(/Submitted batch job\s+(\d+)/i);
  if (!match) throw new Error(`ORION did not return a Slurm job ID. ${stdout.trim()}`);
  job.user = user;
  job.remoteArtifact = remoteArtifact;
  job.slurmJobId = match[1];
  job.status = "submitted";
  job.detail = `Submitted to ORION as Slurm job ${job.slurmJobId}. Refresh to monitor it.`;
  return jobView(job);
});

app.get("/api/jobs/:id", async (request) => {
  const job = jobs.get((request.params as { id: string }).id);
  if (!job) throw new Error("This local publish session no longer exists. Upload the PDF again.");
  if (!job.slurmJobId || !job.user || ["ready_to_import", "imported", "failed"].includes(job.status)) return jobView(job);
  try {
    const { stdout } = await run("ssh", sshArgs(job.user, `sacct -j ${quote(job.slurmJobId)} --format=JobIDRaw,State,ExitCode --noheader --parsable2`));
    const statusLine = stdout.split("\n").find((line) => line.startsWith(job.slurmJobId!));
    const state = statusLine?.split("|")[1]?.trim().toUpperCase() || "PENDING";
    if (state.startsWith("COMPLETED")) {
      await retrieveCompletedArtifact(job);
    } else if (["FAILED", "CANCELLED", "TIMEOUT", "OUT_OF_MEMORY", "NODE_FAIL"].some((failure) => state.startsWith(failure))) {
      job.status = "failed";
      job.detail = `ORION reported ${state}. Review the Slurm log on ORION before resubmitting.`;
    } else {
      job.status = "running";
      job.detail = `ORION Slurm job ${job.slurmJobId} is ${state.toLowerCase()}.`;
    }
  } catch (error) {
    job.detail = `Could not refresh ORION status: ${error instanceof Error ? error.message : "unknown error"}`;
  }
  return jobView(job);
});

app.post("/api/jobs/:id/import", async (request) => {
  const job = jobs.get((request.params as { id: string }).id);
  if (!job) throw new Error("This local publish session no longer exists. Upload the PDF again.");
  if (job.status !== "ready_to_import") throw new Error("Wait for the ORION artifact to finish and pass validation before importing it.");
  await importArtifact(job);
  return jobView(job);
});

app.delete("/api/jobs/:id", async (request) => {
  const id = (request.params as { id: string }).id;
  const job = jobs.get(id);
  if (!job) return { deleted: false };
  await rm(job.pdfPath, { force: true });
  if (job.localArtifact) await rm(job.localArtifact, { force: true });
  jobs.delete(id);
  return { deleted: true };
});

app.get("/", async (_request, reply) => reply.type("text/html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HEARMES Research Publisher</title>
<style>
:root{--ink:#172b4d;--muted:#627591;--blue:#2867d9;--line:#d8e4f3;--soft:#f5f8fd;--green:#167a56;--amber:#9a6300;--red:#b23a45}*{box-sizing:border-box}body{margin:0;background:linear-gradient(135deg,#eff5ff,#fff 60%);color:var(--ink);font:15px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}.shell{max-width:960px;margin:auto;padding:42px 20px 64px}.eyebrow{color:var(--blue);font-size:12px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}h1{margin:7px 0;font-size:36px;letter-spacing:-.045em}h2{margin:0 0 7px;font-size:19px}p{color:var(--muted);line-height:1.55}.lead{max-width:700px;font-size:17px}.notice{margin:24px 0;padding:15px 17px;border:1px solid #f0dcaa;border-radius:14px;background:#fffaf0;color:#765100;font-size:13px;line-height:1.55}.steps{display:grid;gap:14px}.step{padding:22px;border:1px solid var(--line);border-radius:17px;background:#fff;box-shadow:0 8px 25px #173e7910}.step-head{display:flex;align-items:center;gap:10px}.number{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:#e9f1ff;color:var(--blue);font-weight:850}label{display:block;margin:14px 0 6px;font-weight:750}input[type=text],input[type=file]{width:100%;padding:11px;border:1px solid #bfcfe5;border-radius:10px;font:inherit}button{margin-top:14px;padding:10px 14px;border:0;border-radius:10px;background:var(--blue);color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 6px 15px #2d68c633}button.secondary{background:#fff;color:var(--blue);border:1px solid #b7cae9;box-shadow:none}button:disabled{opacity:.55;cursor:not-allowed}.status{min-height:22px;margin:11px 0 0;color:var(--muted);font-size:13px}.status.ok{color:var(--green)}.status.error{color:var(--red)}code{display:block;overflow:auto;margin:12px 0 0;padding:11px;border-radius:10px;background:#101d33;color:#ecf4ff;font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.job{display:none;margin-top:17px;padding:15px;border-radius:12px;background:var(--soft);border:1px solid var(--line)}.job.show{display:block}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:11px}.meta div{padding:10px;border:1px solid var(--line);border-radius:9px;background:#fff}.meta span{display:block;color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase}.meta b{display:block;margin-top:3px;font-size:13px;word-break:break-word}.hidden{display:none}@media(max-width:640px){h1{font-size:30px}.meta{grid-template-columns:1fr}}
</style></head><body><main class="shell"><div class="eyebrow">Local-only tool</div><h1>HEARMES Research Publisher</h1><p class="lead">Turn an approved HEAIR paper into verified, page-cited Coach knowledge without manually running each command. This dashboard runs only on your computer at <code style="display:inline;padding:2px 5px">localhost</code>.</p><div class="notice"><strong>Security boundary:</strong> connect Cisco Secure Client and complete Duo in your normal Terminal window. This dashboard never receives or stores a NinerNET password, Duo code, or database URL. It uses a temporary, local SSH connection you establish.</div><div class="steps">
<section class="step"><div class="step-head"><div class="number">1</div><div><h2>Connect to UNC Charlotte ORION</h2><p>With Cisco VPN connected, run this once in a separate Mac Terminal. Keep that Terminal window open while publishing.</p></div></div><label for="user">NinerNET username</label><input id="user" type="text" autocomplete="username" placeholder="ptanike1"><code id="connectCommand">ssh -M -S &quot;$HOME/.ssh/hearmes-orion.sock&quot; -o ControlPersist=30m -N YOUR_NINERNET_USERNAME@hpc.charlotte.edu</code><button class="secondary" id="checkConnection">Check secure connection</button><div class="status" id="connectionStatus"></div></section>
<section class="step"><div class="step-head"><div class="number">2</div><div><h2>Upload an approved HEAIR paper</h2><p>The PDF stays in a temporary local workspace until it is securely copied to your ORION account for the scheduled job. Maximum 12 MB.</p></div></div><label for="pdf">Approved HEAIR PDF</label><input id="pdf" type="file" accept="application/pdf,.pdf"><button id="upload">Prepare paper</button><div class="status" id="uploadStatus"></div></section>
<section class="step"><div class="step-head"><div class="number">3</div><div><h2>Build and validate on ORION</h2><p>The publisher uploads the approved paper, submits the existing Slurm job, monitors it, then validates the artifact before it can enter Coach retrieval.</p></div></div><div class="job" id="job"><div class="meta"><div><span>File</span><b id="jobFile"></b></div><div><span>SHA-256</span><b id="jobHash"></b></div><div><span>Job status</span><b id="jobStatus"></b></div></div><p id="jobDetail"></p><button id="submit">Submit to ORION</button><button class="secondary" id="refresh">Refresh status</button><button class="secondary hidden" id="import">Import verified artifact into Coach</button><button class="secondary" id="cleanup">Delete local copy</button></div></section>
</div></main><script>
let job=null;const $=id=>document.getElementById(id);const status=(id,message,kind='')=>{const node=$(id);node.textContent=message;node.className='status '+kind};const user=()=>$('user').value.trim();function updateCommand(){$('connectCommand').textContent='ssh -M -S "$HOME/.ssh/hearmes-orion.sock" -o ControlPersist=30m -N '+(user()||'YOUR_NINERNET_USERNAME')+'@hpc.charlotte.edu'}$('user').addEventListener('input',updateCommand);updateCommand();
async function request(path,options={}){const response=await fetch(path,options);const data=await response.json();if(!response.ok)throw new Error(data.message||data.error||'Request failed');return data}function render(current){job=current;$('job').classList.add('show');$('jobFile').textContent=job.originalName;$('jobHash').textContent=job.sha256.slice(0,16)+'…';$('jobStatus').textContent=job.status.replaceAll('_',' ');$('jobDetail').textContent=job.detail;$('submit').disabled=job.status!=='uploaded';$('refresh').disabled=!job.slurmJobId||['ready_to_import','imported','failed'].includes(job.status);$('import').classList.toggle('hidden',job.status!=='ready_to_import');$('import').disabled=job.status!=='ready_to_import';if(job.artifactSummary)$('jobDetail').textContent+=' Verified '+job.artifactSummary.pages+' pages and '+job.artifactSummary.chunks+' searchable chunks.'}
$('checkConnection').onclick=async()=>{status('connectionStatus','Checking local secure connection…');try{const data=await request('/api/connection?user='+encodeURIComponent(user()));status('connectionStatus',data.message,data.connected?'ok':'error')}catch(error){status('connectionStatus',error.message,'error')}};
$('upload').onclick=async()=>{const file=$('pdf').files[0];if(!file)return status('uploadStatus','Choose the approved PDF first.','error');status('uploadStatus','Saving the local temporary copy…');try{const data=await request('/api/papers',{method:'POST',headers:{'content-type':'application/pdf','x-hearmes-file-name':file.name},body:await file.arrayBuffer()});render(data);status('uploadStatus','Paper prepared. Confirm the secure ORION connection, then submit it.','ok')}catch(error){status('uploadStatus',error.message,'error')}};
$('submit').onclick=async()=>{if(!job)return;try{render({...job,status:'submitted',detail:'Connecting to ORION and submitting the Slurm job…'});render(await request('/api/jobs/'+job.id+'/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({user:user()})}))}catch(error){render({...job,status:'uploaded',detail:error.message});}};
$('refresh').onclick=async()=>{if(!job)return;try{render(await request('/api/jobs/'+job.id))}catch(error){$('jobDetail').textContent=error.message}};
$('import').onclick=async()=>{if(!job||!confirm('Import this validated artifact into the Coach retrieval database? This replaces the previous full HEAIR paper import.'))return;try{render({...job,detail:'Importing the validated artifact…'});render(await request('/api/jobs/'+job.id+'/import',{method:'POST'}))}catch(error){$('jobDetail').textContent=error.message}};
$('cleanup').onclick=async()=>{if(!job||!confirm('Delete this local temporary PDF and artifact? This does not delete the ORION copy.'))return;await request('/api/jobs/'+job.id,{method:'DELETE'});job=null;$('job').classList.remove('show');status('uploadStatus','Local temporary files deleted.','ok')};
</script></body></html>`));

app.setErrorHandler((error, _request, reply) => reply.status(400).send({
  error: "Research Publisher error",
  message: error instanceof Error ? error.message : "Unexpected local publisher error."
}));

await app.listen({ port: Number(process.env.HEARMES_PUBLISHER_PORT || 3060), host: "127.0.0.1" });
console.log("HEARMES Research Publisher is running at http://127.0.0.1:3060");
