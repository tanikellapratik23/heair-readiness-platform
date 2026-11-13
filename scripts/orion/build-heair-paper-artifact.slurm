#!/usr/bin/env bash
# Submit resource settings with sbatch. This script intentionally does not
# assume a partition, account, GPU, module, or wall-time limit.
set -euo pipefail

: "${HEARMES_REPO:?Set HEARMES_REPO to the cloned repository in your ORION home directory.}"
: "${HEARMES_PDF:?Set HEARMES_PDF to an approved PDF in your ORION home directory.}"
: "${HEARMES_OUTPUT:?Set HEARMES_OUTPUT to a durable artifact path in your ORION home directory.}"

HEARMES_PYTHON="${HEARMES_PYTHON:-$HEARMES_REPO/.venv-pdf/bin/python}"
if [[ ! -x "$HEARMES_PYTHON" ]]; then
  echo "Python environment not found at $HEARMES_PYTHON. Create it on the login node before submitting." >&2
  exit 2
fi

work_dir="${HEARMES_WORKDIR:-${TMPDIR:-/tmp}/hearmes-${SLURM_JOB_ID:-manual}}"
mkdir -p "$work_dir"
pages_json="$work_dir/heair-pages.json"
cleanup() { rm -rf "$work_dir"; }
trap cleanup EXIT

echo "Building HEAIR paper artifact on $(hostname) at $(date -u)"
"$HEARMES_PYTHON" "$HEARMES_REPO/scripts/extract-heair-pdf.py" "$HEARMES_PDF" "$pages_json"
cd "$HEARMES_REPO"
npm run knowledge:build:heair-paper-artifact -- --input "$pages_json" --output "$HEARMES_OUTPUT"
echo "Artifact completed at $(date -u): $HEARMES_OUTPUT"
