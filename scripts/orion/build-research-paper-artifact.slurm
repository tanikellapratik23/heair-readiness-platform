#!/usr/bin/env bash
# Submit resource settings with sbatch. The dashboard supplies approved values.
set -euo pipefail

module load node.js/22.20.0
: "${HEARMES_REPO:?Set HEARMES_REPO to the cloned repository in ORION home storage.}"
: "${HEARMES_PDF:?Set HEARMES_PDF to an approved PDF in ORION home storage.}"
: "${HEARMES_OUTPUT:?Set HEARMES_OUTPUT to a durable artifact path in ORION home storage.}"
: "${HEARMES_TITLE:?Set HEARMES_TITLE to the reviewed source title.}"
: "${HEARMES_CITATION:?Set HEARMES_CITATION to the reviewed citation.}"
HEARMES_SOURCE_TYPE="${HEARMES_SOURCE_TYPE:-research_paper}"
HEARMES_PYTHON="${HEARMES_PYTHON:-$HEARMES_REPO/.venv-pdf/bin/python}"
if [[ ! -x "$HEARMES_PYTHON" ]]; then
  echo "Python environment not found at $HEARMES_PYTHON. Create it on the login node before submitting." >&2
  exit 2
fi

work_dir="${HEARMES_WORKDIR:-${TMPDIR:-/tmp}/hearmes-${SLURM_JOB_ID:-manual}}"
mkdir -p "$work_dir"
pages_json="$work_dir/research-pages.json"
cleanup() { rm -rf "$work_dir"; }
trap cleanup EXIT

echo "Building research-paper artifact on $(hostname) at $(date -u)"
"$HEARMES_PYTHON" "$HEARMES_REPO/scripts/extract-heair-pdf.py" "$HEARMES_PDF" "$pages_json"
cd "$HEARMES_REPO"
npm run knowledge:build:research-paper-artifact -- --input "$pages_json" --output "$HEARMES_OUTPUT" --title "$HEARMES_TITLE" --citation "$HEARMES_CITATION" --source-type "$HEARMES_SOURCE_TYPE"
echo "Artifact completed at $(date -u): $HEARMES_OUTPUT"
