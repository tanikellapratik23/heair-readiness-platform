#!/bin/bash
# Supply the verified partition/account and resource requests to sbatch, not here.
set -euo pipefail
: "${HEARMES_REPO:?Set HEARMES_REPO to the checkout in home}"
: "${HEARMES_INPUT:?Set HEARMES_INPUT to an absolute input manifest path}"
: "${HEARMES_OUTPUT:?Set HEARMES_OUTPUT to a new absolute artifact path in durable home storage}"
cd "$HEARMES_REPO"
printf 'Job %s started on %s at %s\n' "${SLURM_JOB_ID:-unknown}" "$(hostname)" "$(date -u)"
npm run research:build -- --input "$HEARMES_INPUT" --output "$HEARMES_OUTPUT"
printf 'Artifact completed at %s\n' "$(date -u)"
