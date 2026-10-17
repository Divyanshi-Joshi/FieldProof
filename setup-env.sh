#!/usr/bin/env bash
# FieldProof Environment Setup for Linux / macOS
# Usage: source setup-env.sh

# Load variables from .env if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    while IFS='=' read -r key value || [ -n "$key" ]; do
        [[ "$key" =~ ^#.*$ ]] && continue
        [ -z "$key" ] && continue
        clean_key=$(echo "$key" | xargs)
        clean_val=$(echo "$value" | tr -d '"' | tr -d "'" | tr -d '\r' | xargs)
        export "$clean_key"="$clean_val"
    done < "$SCRIPT_DIR/.env"
fi

[ -z "$FIELDPROOF_GCP_PROJECT" ] && export FIELDPROOF_GCP_PROJECT="fieldproof-prod"
[ -z "$FIELDPROOF_VERTEX_LOCATION" ] && export FIELDPROOF_VERTEX_LOCATION="global"
[ -z "$FIELDPROOF_GEMINI_MODEL" ] && export FIELDPROOF_GEMINI_MODEL="gemini-3-flash-preview"
[ -z "$CR_REGION" ] && export CR_REGION="asia-south1"

echo -e "\033[32mFieldProof environment variables loaded:\033[0m"
echo -e "  FIELDPROOF_GCP_PROJECT     = $FIELDPROOF_GCP_PROJECT"
echo -e "  FIELDPROOF_VERTEX_LOCATION = $FIELDPROOF_VERTEX_LOCATION"
echo -e "  FIELDPROOF_GEMINI_MODEL    = $FIELDPROOF_GEMINI_MODEL"
echo -e "  CR_REGION                  = $CR_REGION"
if [ -n "$GEMINI_API_KEY" ]; then
    echo -e "  GEMINI_API_KEY             = [Configured from .env]"
fi
