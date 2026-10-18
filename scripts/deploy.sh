#!/usr/bin/env bash
# ==============================================================================
# FieldProof Cloud Run Deployment Script
# See docs/DAY1_PERSON_A.md §T5 and §O11
# ==============================================================================
set -euo pipefail

ENV_FILE="${HOME}/fieldproof.env"
ROOT_ENV="$(dirname "$0")/../.env"

if [[ -f "$ENV_FILE" ]]; then
    echo "==> Sourcing environment from $ENV_FILE..."
    # shellcheck disable=SC1090
    source "$ENV_FILE"
elif [[ -f "$ROOT_ENV" ]]; then
    echo "==> Sourcing environment from $ROOT_ENV..."
    # shellcheck disable=SC1090
    set -a
    source "$ROOT_ENV"
    set +a
else
    echo "WARNING: Neither $ENV_FILE nor $ROOT_ENV found. Checking current environment variables..."
fi

# Allow .env variable naming conventions
PROJECT_ID="${PROJECT_ID:-${FIELDPROOF_GCP_PROJECT:-}}"
VERTEX_LOCATION="${VERTEX_LOCATION:-${FIELDPROOF_VERTEX_LOCATION:-}}"
GEMINI_MODEL="${GEMINI_MODEL:-${FIELDPROOF_GEMINI_MODEL:-}}"

# Validate required deployment variables
MISSING_VARS=()
[[ -z "${PROJECT_ID:-}" ]] && MISSING_VARS+=("PROJECT_ID (or FIELDPROOF_GCP_PROJECT)")
[[ -z "${CR_REGION:-}" ]] && MISSING_VARS+=("CR_REGION")
[[ -z "${VERTEX_LOCATION:-}" ]] && MISSING_VARS+=("VERTEX_LOCATION (or FIELDPROOF_VERTEX_LOCATION)")
[[ -z "${GEMINI_MODEL:-}" ]] && MISSING_VARS+=("GEMINI_MODEL (or FIELDPROOF_GEMINI_MODEL)")

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo ""
    echo "ERROR: The following required deployment variables are missing or empty:"
    for v in "${MISSING_VARS[@]}"; do
        echo "  - $v"
    done
    echo ""
    echo "Please define them in $ENV_FILE or export them in your shell."
    echo "Example $ENV_FILE:"
    echo "  export PROJECT_ID=my-gcp-project"
    echo "  export CR_REGION=asia-south1"
    echo "  export VERTEX_LOCATION=global"
    echo "  export GEMINI_MODEL=gemini-3-flash-preview"
    exit 1
fi

echo "==> Deploying FieldProof to Cloud Run:"
echo "    Project:         $PROJECT_ID"
echo "    Region:          $CR_REGION"
echo "    Vertex Location: $VERTEX_LOCATION"
echo "    Gemini Model:    $GEMINI_MODEL"
echo "    Service Account: fieldproof-run@${PROJECT_ID}.iam.gserviceaccount.com"
echo ""

gcloud run deploy fieldproof \
    --source . \
    --region "$CR_REGION" \
    --service-account "fieldproof-run@${PROJECT_ID}.iam.gserviceaccount.com" \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 1 \
    --set-env-vars "FIELDPROOF_GCP_PROJECT=${PROJECT_ID},FIELDPROOF_VERTEX_LOCATION=${VERTEX_LOCATION},FIELDPROOF_GEMINI_MODEL=${GEMINI_MODEL},FIELDPROOF_LIVE_UPLOADS_ENABLED=true"
