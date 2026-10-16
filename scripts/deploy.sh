#!/usr/bin/env bash
# ==============================================================================
# FieldProof Cloud Run Deployment Script
# See docs/DAY1_PERSON_A.md §T5 and §O11
# ==============================================================================
set -euo pipefail

ENV_FILE="${HOME}/fieldproof.env"

if [[ -f "$ENV_FILE" ]]; then
    echo "==> Sourcing environment from $ENV_FILE..."
    # shellcheck disable=SC1090
    source "$ENV_FILE"
else
    echo "WARNING: $ENV_FILE not found. Checking current environment variables..."
fi

# Validate required deployment variables
MISSING_VARS=()
[[ -z "${PROJECT_ID:-}" ]] && MISSING_VARS+=("PROJECT_ID")
[[ -z "${CR_REGION:-}" ]] && MISSING_VARS+=("CR_REGION")
[[ -z "${VERTEX_LOCATION:-}" ]] && MISSING_VARS+=("VERTEX_LOCATION")
[[ -z "${GEMINI_MODEL:-}" ]] && MISSING_VARS+=("GEMINI_MODEL")

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
    --set-env-vars "FIELDPROOF_GCP_PROJECT=${PROJECT_ID},FIELDPROOF_VERTEX_LOCATION=${VERTEX_LOCATION},FIELDPROOF_GEMINI_MODEL=${GEMINI_MODEL}"
