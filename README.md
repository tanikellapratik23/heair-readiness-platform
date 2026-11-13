# Project HEARMES

The **Project HEARMES** platform evaluates organizational readiness for responsible AI integration in higher education. It provides a structured, role-adaptive assessment framework that turns readiness data into actionable coaching insights.

Working backend for role-adaptive Higher Education AI Readiness and Maturity Evaluation System assessments. The draft instrument is seeded as four dimensions, seventeen sub-dimensions, and 102 role-specific metric questions across Student, Faculty, Executive Leadership, Administrative Staff, Programming Staff, and Finance Staff.

---

## Take the Assessment

Want to see how AI-ready your organization is?

**[Take the Project HEARMES Assessment](https://tanikellapratik23.github.io/heair-readiness-platform)**

- **Role-specific instrument**: Questions use their appropriate awareness, frequency, confidence, likelihood, importance, or agreement metric scale.
- **Instant AI Score & Coaching Response**: Receive a customized, AI-generated breakdown tailored to your results, highlighting key strengths and immediate steps for growth.

---

## Features

- **Interactive Assessment Interface**: Role-adaptive diagnostic hosted via GitHub Pages.
- **AI Score Coaching Chat**: Real-time, context-aware AI coaching and personalized feedback based on user scores.
- **Modular Architecture**: Scalable routing system designed for fast evaluation and seamless integration.

---

## Importing an approved HEAIR paper into Coach retrieval

The live Coach starts with a compact curated HEAIR framework corpus. To add an approved full paper to the existing Neon/PostgreSQL retrieval path, extract its text locally, review the page text, then run the explicit admin import. The PDF, extracted text, and generated inputs are intentionally ignored by Git.

```sh
# On a trusted machine with the database connection configured.
python3 -m pip install pypdf
python3 scripts/extract-heair-pdf.py /absolute/path/HEAIR.pdf /private/path/heair-pages.json
npm run knowledge:import:heair-paper -- --input /private/path/heair-pages.json --dry-run
npm run knowledge:import:heair-paper -- --input /private/path/heair-pages.json
```

The importer replaces the prior full-paper import with a deterministic set of page-aware chunks. It does not alter assessment scores, user data, or the existing 13 curated framework chunks. Verify several Coach queries and their displayed page/section citations before treating the full paper as production-ready.

### Optional ORION build, then Neon import

ORION can prepare the same retrieval artifact offline through Slurm. The live site does **not** contact ORION or scratch storage. The scheduled job writes a validated JSON artifact to durable ORION home storage; copy that artifact to a trusted Mac, then explicitly import it into Neon.

On the **ORION login node** (development/setup only), clone or update the repository in `/users/<NinerNET>/`, then prepare the PDF-only Python environment:

```sh
module load node.js/22.20.0
cd /users/<NinerNET>/hearmes-orion
git switch main && git pull --ff-only
npm ci && npm run db:generate
python3 -m venv .venv-pdf
.venv-pdf/bin/python -m pip install pypdf
mkdir -p /users/<NinerNET>/hearmes-artifacts /users/<NinerNET>/hearmes-logs
```

Upload an approved PDF to `/users/<NinerNET>/hearmes-inputs/` first. Then submit the **scheduled compute job** (the known `Orion` CPU partition is shown; adjust only if URC directs you to another approved resource):

```sh
export HEARMES_REPO=/users/<NinerNET>/hearmes-orion
export HEARMES_PDF=/users/<NinerNET>/hearmes-inputs/HEAIR.pdf
export HEARMES_OUTPUT=/users/<NinerNET>/hearmes-artifacts/heair-paper-v1.artifact.json

sbatch --partition=Orion --cpus-per-task=1 --mem=2G --time=00:10:00 \
  --output=/users/<NinerNET>/hearmes-logs/heair-paper-%j.out \
  --error=/users/<NinerNET>/hearmes-logs/heair-paper-%j.err \
  scripts/orion/build-heair-paper-artifact.slurm
```

After Slurm reports `COMPLETED` with exit code `0`, copy the artifact from durable ORION home storage to a trusted Mac using `scp`. On the **Mac**, validate the artifact before the real import:

```sh
npm run knowledge:import:heair-paper -- --artifact /private/path/heair-paper-v1.artifact.json --dry-run
```

Then set `DATABASE_URL` only in the current terminal session and run the same command without `--dry-run`. The importer verifies schema, page count, chunk indexes, and an integrity checksum before replacing the prior full-paper import in Neon.

### Local Research Publisher dashboard

For approved shared research sources, the local-only Research Publisher replaces the repeated upload, Slurm submission, artifact-copy, and import commands with a guided browser workflow. It binds only to `127.0.0.1`; it is not part of the public HEARMES website and does not expose a public upload endpoint.

The dashboard deliberately never asks for a NinerNET password, Duo code, VPN credentials, or database URL. Connect Cisco Secure Client first, then establish a temporary SSH control connection in a separate Mac Terminal (complete Duo there):

```sh
ssh -M -S "$HOME/.ssh/hearmes-orion.sock" -o ControlPersist=30m -N <NinerNET>@hpc.charlotte.edu
```

In another terminal, from this repository, set `DATABASE_URL` only for the current session if you intend to do the final database import, then start the dashboard:

```sh
npm run research:publisher
```

Open `http://127.0.0.1:3060`. The dashboard requires a title, citation or stable source reference, and source category before it uploads the approved PDF to the caller's ORION home directory. It submits the CPU Slurm workflow, polls Slurm status, copies the completed artifact back to a temporary local directory, validates it with the applicable dry-run importer, and enables the explicit Neon import only after that validation passes.

The **Full HEAIR paper** category replaces only the existing full-HEAIR-paper source. **Research paper** and **Best-practice guidance** each produce a separate, deterministic source record, preserving their own title, citation, PDF pages, and chunks for Coach citations. Publish only approved, non-sensitive shared research sources. Do not use this shared corpus workflow for participant records, user-uploaded private documents, chat context, or confidential institutional material.
