# FieldProof — User Action Items & Configuration Checklist

> **Purpose:** This document lists everything required from **you (Person A)** outside the AI coding agent: GCP project setup, API enablement, environment variables, authentication, dataset coordination with Person B, and deployment.
> 
> Reference: [`docs/DAY1_PERSON_A.md`](docs/DAY1_PERSON_A.md)

---

## 1. Local Environment Variables (`~/fieldproof.env`)

Create or update `~/fieldproof.env` on your local machine (this file is git-ignored and never committed):

```bash
# ~/fieldproof.env
export PROJECT_ID="<your-gcp-project-id>"
export CR_REGION="asia-south1"          # Mumbai (or asia-south2 Delhi)
export VERTEX_LOCATION="global"         # Or regional, e.g. asia-south1 (depends on model availability)
export GEMINI_MODEL="gemini-3-flash-preview" # Tested model ID from O7

# Spring Boot / FieldProof mapped variables
export FIELDPROOF_GCP_PROJECT="${PROJECT_ID}"
export FIELDPROOF_VERTEX_LOCATION="${VERTEX_LOCATION}"
export FIELDPROOF_GEMINI_MODEL="${GEMINI_MODEL}"

# Optional Tuning (defaults will apply if omitted)
export FIELDPROOF_GEMINI_TEMPERATURE=""
export FIELDPROOF_GEMINI_THINKING=""
export FIELDPROOF_GEMINI_MEDIA_RES=""
export FIELDPROOF_PRICING_INPUT=""
export FIELDPROOF_PRICING_OUTPUT=""
```

Then load it into your current shell before running tests or the server:
```bash
source ~/fieldproof.env
```

---

## 2. Google Cloud Platform Setup (Manual Steps O2–O6)

Run these commands in your terminal once your Google Cloud CLI (`gcloud`) is installed:

### Step 2.1: Authentication & Project Selection
```bash
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud auth application-default login
gcloud auth application-default set-quota-project $PROJECT_ID
```

### Step 2.2: Enable GCP APIs
```bash
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  bigquery.googleapis.com \
  storage.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### Step 2.3: Create Cloud Run Runtime Service Account
```bash
gcloud iam service-accounts create fieldproof-run --display-name="FieldProof Cloud Run"

for ROLE in roles/aiplatform.user roles/bigquery.dataEditor roles/bigquery.jobUser roles/storage.objectAdmin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:fieldproof-run@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$ROLE"
done
```

### Step 2.4: Create Image Storage Bucket (Preparation for Friday)
```bash
gcloud storage buckets create gs://${PROJECT_ID}-fieldproof-images \
  --location="${CR_REGION}" \
  --uniform-bucket-level-access
```

### Step 2.5: Budget & Cost Alerts
In the Cloud Console (Billing -> Budgets & alerts), create alerts at:
- **$15.00** (50% warning)
- **$30.00** (critical stop warning)

---

## 3. Vertex AI Model Verification (Step O7)

Before triggering Gemini from Java or Cloud Run, test the model from your shell to confirm the Model ID and Location:

```bash
cat > /tmp/req.json <<'EOF'
{"contents":[{"role":"user","parts":[{"text":"Reply with the single word OK"}]}]}
EOF

# Test global location (recommended for preview models like gemini-3-flash-preview)
curl -s -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @/tmp/req.json \
  "https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent"
```
* **Success:** JSON response containing `"text": "OK"`.
* **404:** Model ID retired or not available in that location. Check Vertex AI Model Garden.
* **403:** Permission or API not enabled. Check Steps 2.1 & 2.2.

---

## 4. Dataset & Anchors from Person B (Steps O9 & O10)

Before running the evaluation smoke test (Task T10), agree with Person B on:

1. **Development Images (`data/dev30/`)**:
   - Put ~30 uncommitted images in `data/dev30/` (e.g. `img_001.jpg`, etc.).
   - Put `data/dev30/labels.csv` with columns:
     ```csv
     image_id,file_name,damaged,damage_type,plot_id,season,county
     ```
2. **Anchor Images (`data/anchors/`)**:
   - 3 clear reference images: one healthy, one moderate damage, one severe damage.
   - Record in `data/anchors/anchors.json`:
     ```json
     [
       {"level": "healthy", "file": "data/anchors/healthy_ref.jpg"},
       {"level": "moderate", "file": "data/anchors/moderate_ref.jpg"},
       {"level": "severe", "file": "data/anchors/severe_ref.jpg"}
     ]
     ```
3. **Allowed Damage Types (`src/main/resources/config/label-map.yml`)**:
   - Update with real dataset damage types (e.g., `drought`, `pest`, `disease`, `none`, `other`).

---

## 5. Deployment to Cloud Run (Step O11 / Task T5)

Once environment variables are set and verified:

```bash
# Ensure deploy script is executable and run it
./scripts/deploy.sh
```

After deployment completes, test the live endpoints:
- `https://<cloud-run-url>/api/health` (must return `{status: "UP", ...}`)
- `https://<cloud-run-url>/api/gemini/ping` (verifies Cloud Run service account has Vertex AI access)

---

## 6. Open Decisions for Person A / Person B (Section 2 of DAY1_PERSON_A.md)

| ID | Topic | Action Needed |
|---|---|---|
| **D6** | Dataset label schema | Confirm which labels in `labels.csv` count as damaged and fill `label-map.yml`. |
| **D7** | Photos per claim | Single image vs. 3-photo bundles per plot/season. |
| **D8** | Severity band rules | Confirm Day 1 proposal: only SEVERE is strict 2-of-3 signs >= 2; soil cracking is reported as flag only. |
| **D9** | Repository visibility | Keep private until secrets/images are confirmed excluded; public before submission. |
| **D10** | BigQuery dataset location | Agree with Person B on BigQuery region (e.g. `asia-south1`). |
