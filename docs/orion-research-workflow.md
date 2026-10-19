# Optional ORION research retrieval artifact

This is a CPU-only experimental **lexical vector** index. It uses signed SHA-256 feature hashing, not a neural language model and not semantic embeddings. It downloads no model, makes no API calls, and needs no GPU. Its query and document vectors share the same tokenizer, 4096 dimensions, L2 normalization and cosine metric. Hash collisions and lexical matching can reduce quality; evaluate against the current method before enabling it. Switching to a neural encoder later requires a new schema/model and matching server-side query encoder, not just rebuilding documents.

## What the application currently does

The production backend is Node/TypeScript/Fastify on Render with PostgreSQL and Prisma. `scripts/ingest_knowledge.ts` ingests UTF-8 `.txt` files and `ingest.ts` stores 450-word chunks with a 350-word stride in PostgreSQL. It does **not** create embeddings; the JSON embedding column is unused. The default coach fetches HEAIR paper chunks from PostgreSQL and ranks them with role, weak subdimension, dimension and question keywords. No model or query embedding is currently configured. It formats retrieved text and source metadata for Claude; chat citations are assembled from retrieved title, citation, publisher, date, source type and section. Citation links are only as specific as the supplied metadata. No changes are made to authentication, assessment scores, database schema, or default retrieval.

The optional artifact holds chunks, source metadata and sparse vectors in a versioned JSON file. The server validates it at startup and fails closed on incompatible versions, inconsistent IDs, counts or vectors. Each new output path must not already exist: a new artifact is published atomically, not mixed with or substituted for an existing one. Input documents must be approved for use; the index contains their actual text. The server loads the full JSON in memory and verifies all vectors, so measure startup time, disk size and peak memory on representative data before enabling it, particularly on a 512 MB Render instance. No large files are committed. Limit access to artifacts and keep assessment data out of them.

## Prerequisites and read-only checks — Mac and ORION login node

First push the branch to GitHub. Off campus, connect the university VPN, then on **Mac**:

```sh
ssh ptanike1@hpc.charlotte.edu
```

Use your normal authentication and Duo; never send credentials to anyone. On the **ORION login node**, inspect available resources; ask URC which CPU partition, account, limits and Node module are authorized. The university's [getting started page](https://oneit.charlotte.edu/innovation/research-computing/get-started/) provides an example partition, but access is not verified for this account. Consult the [ORION user notes](https://oneit.charlotte.edu/innovation/research-computing/research-cluster/orion-nebula-and-gpu-user-notes/) and local examples:

```sh
sinfo
ls /apps/slurm/examples
module avail 2>&1 | grep -i node
node --version
npm --version
```

Choose a URC-supported Node version at least 20 and set it up in your home environment, without sudo. If a module is required, ask URC for its exact name and load it on both login and compute nodes; ensure `node` and `npm` are on the batch job's PATH. The workflow is Node, not Python, so no Python environment or CUDA is required. If internet is restricted, ask URC how to stage an approved Node environment and npm dependencies; do not run an unverified binary. No model/cache download is needed.

## Checkout and install — ORION login node

```sh
cd /users/ptanike1
git clone https://github.com/tanikellapratik23/heair-readiness-platform.git hearmes-orion
cd hearmes-orion
git fetch origin codex/orion-research-embeddings
git switch --track origin/codex/orion-research-embeddings
npm ci
npm run db:generate
mkdir -p /users/ptanike1/hearmes-artifacts /users/ptanike1/hearmes-inputs /users/ptanike1/hearmes-logs
```

`npm ci` requires package registry access. Keep code, executables and dependencies in home. The final artifact is in home (backed up); any approved temporary data may be placed in `/scratch/ptanike1` but scratch is not backed up. Never change permissions of the home or scratch root. The batch command uses a temporary file adjacent to its output and removes it on normal completion or handled failure; a killed process may leave a `.tmp` file to inspect and remove explicitly.

## CPU smoke test — ORION login node submits; compute node executes

Do not run ingestion on the login node. Set these placeholders to values **verified with URC**, including an account flag if required. Resource numbers below are small starting requests, not a claim of permitted limits. Replace the output filename on each run.

```sh
cd /users/ptanike1/hearmes-orion
export HEARMES_REPO=/users/ptanike1/hearmes-orion
export HEARMES_INPUT=/users/ptanike1/hearmes-orion/scripts/orion/fixture/documents.json
export HEARMES_OUTPUT=/users/ptanike1/hearmes-artifacts/smoke-v1.artifact.json
sbatch --partition=VERIFIED_CPU_PARTITION --cpus-per-task=1 --mem=2G --time=00:10:00 --output=/users/ptanike1/hearmes-logs/smoke-%j.slurm.out --error=/users/ptanike1/hearmes-logs/smoke-%j.slurm.err scripts/orion/research-build.slurm
```

Record the job ID. Monitor it on the **login node**:

```sh
squeue -j JOB_ID
sacct -j JOB_ID --format=JobID,State,ExitCode,Elapsed,MaxRSS
cat /users/ptanike1/hearmes-logs/smoke-JOB_ID.slurm.out
cat /users/ptanike1/hearmes-logs/smoke-JOB_ID.slurm.err
```

Require `COMPLETED` and exit code `0:0`, then use a short **scheduled CPU job** for verification (not the login node):

```sh
sbatch --partition=VERIFIED_CPU_PARTITION --cpus-per-task=1 --mem=2G --time=00:10:00 --output=/users/ptanike1/hearmes-logs/verify-%j.slurm.out --wrap='cd /users/ptanike1/hearmes-orion && npm run research:verify -- /users/ptanike1/hearmes-artifacts/smoke-v1.artifact.json "student privacy data"'
```

Check the verification log: the synthetic privacy title, section and citation should appear. GPU, internet on compute nodes, and any particular module or account flags have not been verified.

## Approved research documents and full batch — Mac, then ORION

Only the existing UTF-8 plain text format is supported. Convert approved PDFs to text separately and check the extraction manually; retain accurate page/section provenance by placing separate sections or pages in separate text files. The importer does not infer page numbers. On **Mac**, upload approved files using SCP after connecting the VPN:

```sh
scp /absolute/path/approved-section.txt ptanike1@hpc.charlotte.edu:/users/ptanike1/hearmes-inputs/
```

On the **ORION login node**, create `/users/ptanike1/hearmes-inputs/documents.json` with an editor; paths are relative to that JSON. Example (replace all sample metadata with verified details):

```json
{"documents":[{"path":"approved-section.txt","title":"Verified document title","sourceType":"heair_paper","citation":"https://example.org/verified-document","publisher":"Verified publisher","publishedAt":"2026-01-01","section":"Verified section","page":"4","roles":["student"],"dimensionId":"education","subDimensionId":"ai_literacy"}]}
```

Allowed source types are `heair_paper`, `framework`, `research_paper`, `best_practice`. Metadata applies to every chunk of that file; omit uncertain optional fields. All input errors stop the build. Submit the same script with `HEARMES_INPUT` pointing to that JSON and a new `HEARMES_OUTPUT` in home, using verified Slurm limits. Use the monitoring and verification commands above. Inspect source citations before publishing; these are research text, not verified institutional policy.

## Transfer and backend deployment

On **Mac** after the job completes:

```sh
mkdir -p "$HOME/hearmes-artifacts"
scp ptanike1@hpc.charlotte.edu:/users/ptanike1/hearmes-artifacts/REPLACE.artifact.json "$HOME/hearmes-artifacts/"
shasum -a 256 "$HOME/hearmes-artifacts/REPLACE.artifact.json"
```

Compare with `sha256sum /users/ptanike1/hearmes-artifacts/REPLACE.artifact.json` on ORION. Locally, in the checkout, run `npm run research:verify -- "$HOME/hearmes-artifacts/REPLACE.artifact.json" "your research query"` and inspect the sources. For deployment, securely provision the same checked artifact to a durable location readable by the existing backend, verify its SHA-256, and set `HEAIR_RETRIEVAL_ARTIFACT_PATH` to its absolute path before starting the server. Render free web-service filesystems are ephemeral: a manual copy will not survive redeploys. Arrange a secure deployment-time fetch from approved storage or an appropriately protected persistent volume, subject to the chosen plan and research-data policies; neither is provisioned by this change. Do not put private text, credentials or generated indexes in Git or a public download. On an actual deployment, repeat the verification using the deployed artifact and check coach source references with a test account. A healthy `/health` alone does not confirm retrieval quality.

To roll back, unset `HEAIR_RETRIEVAL_ARTIFACT_PATH` and redeploy/restart the backend. PostgreSQL retrieval resumes; no data migration is necessary. Preserve the last validated artifact separately. ORION is a batch producer only, not a persistent public inference endpoint.
