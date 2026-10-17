# 🚀 FieldProof — Complete Application Run Guide

> This guide provides step-by-step instructions to run the entire FieldProof system locally (Spring Boot Backend + React Frontend + Evaluation Runner + Docker / Cloud Run deployment) assuming all credentials and environment variables are configured.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **Java 21 LTS** (`java -version`)
- **Node.js 18+ & npm** (`node -v` and `npm -v`)
- **Google Cloud CLI (`gcloud`)** (`gcloud --version`)
- **Docker** (optional, for local container testing: `docker --version`)

---

## 2. Environment Configuration

In order to run Gemini vision perception, a **Google Cloud Project** is required to generate credentials and enable the Generative Language / Vertex AI APIs. FieldProof is tested and calibrated on **`gemini-3-flash-preview`**.

### Option A: Local Run with Gemini API Key (Recommended)
1. In [Google AI Studio](https://aistudio.google.com/) or [Google Cloud Console](https://console.cloud.google.com/), create or select your project.
2. Generate an API Key under that project at [Google AI Studio API Keys](https://aistudio.google.com/app/apikey).
3. In the repository root, copy `.env.example` to `.env` and fill in your values:
   ```env
   FIELDPROOF_GCP_PROJECT="your-gcp-project-id"
   GEMINI_API_KEY="your-gemini-api-key"
   FIELDPROOF_GEMINI_MODEL="gemini-3-flash-preview"
   FIELDPROOF_VERTEX_LOCATION="global"
   CR_REGION="asia-south1"
   ```
4. Run the environment loader script:
   - **Windows PowerShell**:
     ```powershell
     . .\setup-env.ps1
     ```
   - **Linux / macOS**:
     ```bash
     source setup-env.sh
     ```

### Option B: Google Cloud Vertex AI (ADC Mode)
If running against Vertex AI in your Google Cloud Project:
```bash
gcloud auth login
gcloud auth application-default login
gcloud auth application-default set-quota-project <your-gcp-project-id>

export FIELDPROOF_GCP_PROJECT="<your-gcp-project-id>"
export FIELDPROOF_VERTEX_LOCATION="global"              # or asia-south1
export FIELDPROOF_GEMINI_MODEL="gemini-3-flash-preview" # or chosen model
export CR_REGION="asia-south1"
export PORT=8080
```

---

## 3. Running the Backend (Spring Boot 3.4.4)

The backend provides the REST API, deterministic concordance engine, image integrity tools, and Gemini Vertex AI gateway.

### Start Backend Locally:
```bash
# In the project root directory:
./mvnw spring-boot:run -pl backend

# Or via root npm script:
npm run backend

# Or launch both Backend & Frontend together:
./scripts/start.sh
```

The Spring Boot server will start and listen on **`http://localhost:8080`**.

### Verify Backend Health:
Open your browser or run:
```bash
# Liveness / readiness probe (never calls Gemini)
curl -s http://localhost:8080/api/health | jq .

# Vertex AI connectivity test (calls Gemini via ADC)
curl -s http://localhost:8080/api/gemini/ping | jq .
```

Expected response for `/api/health`:
```json
{
  "status": "UP",
  "model": "gemini-3-flash-preview",
  "vertexLocation": "global",
  "buildTime": "2026-10-17T..."
}
```

---

## 4. Running the Frontend (React + Vite + Tailwind CSS)

The frontend contains the interactive 4-in-1 claims reconciliation cockpit:
1. **Hero Landing & Persona Launchpad**
2. **Farmer View** (mobile camera upload & status in English)
3. **Adjuster Triage Cockpit** (3-signal concordance decisioning, policy citations)
4. **Index Doctor Slider** (live policy recalibration simulation)
5. **Validation View** (4-arm ablation study & unit economics)

### Step 4.1: Install Frontend Dependencies (First time only)
```bash
cd frontend
npm install
cd ..
```

### Step 4.2: Start Frontend Development Server
From the project root:
```bash
npm run dev
```
*(Or directly from `frontend/`: `cd frontend && npm run dev`)*

The Vite dev server will start on **`http://localhost:5173`**.

> **API Proxying:** Vite is pre-configured to forward all `/api/*` HTTP calls directly to the Spring Boot backend at `http://localhost:8080`.

---

## 5. End-to-End User Journeys to Test

Open **`http://localhost:5173`** in your browser:

### Journey 1: Farmer Claim Submission
1. Select **"Farmer Claim Submission"**.
2. Select plot **P-0142** (Ramesh Kumar, Maize).
3. Upload field photos or view pre-populated demo bundles.
4. Inspect real-time image integrity checks (perceptual hash deduplication & EXIF analysis).
5. View instant claim feedback in English.

### Journey 2: Loss Adjuster Triage Cockpit
1. Switch to **"Insurer / Adjuster Cockpit"**.
2. View the 8 demo claim bundles categorized by concordance outcome.
3. Open claim **CLM-2026-001**:
   - Weather index: Did not trigger (Rain 341mm > 290mm trigger).
   - Gemini photos: Two passes agreed on **SEVERE** damage.
   - Satellite NDVI: Confirms vegetation stress (z = -1.9).
   - Concordance Table: **`PHENOLOGICAL_BASIS_RISK_GAP`**.
   - Recommendation: **`ESCALATE`** with cited policy clauses (§4.2.1, §5.3, §7.1.4).
4. Click **"Fast-Track Approve"**, **"Escalate"**, or **"Review"** to simulate sign-off.

### Journey 3: The Index Doctor (Policy Recalibration)
1. Select **"The Index Doctor"**.
2. Drag the **Rainfall Trigger Percentile Slider** between 5% and 60%.
3. Watch the real-time simulation across historical plots:
   - Basis-risk false negatives reduced.
   - Payout budget vs. basis-risk coverage equilibrium dynamically plotted.

---

## 6. Running the Day 1 Smoke Evaluation Suite

To run the automated 4-arm ablation evaluation across `data/dev30/labels.csv`:

```bash
# Ensure dev images are in data/dev30/ and environment variables are sourced
source ~/fieldproof.env

# Launch with smoke profile:
./mvnw spring-boot:run -pl backend -Dspring-boot.run.profiles=smoke

# Or via npm:
npm run smoke
```

This runs all 4 experimental arms:
- Arm 1: Raw prompt (1 pass)
- Arm 2: Signs rubric without anchors (1 pass)
- Arm 3: Signs rubric with anchors (pass 1)
- Arm 4: Signs rubric with anchors (pass 2, shuffled anchors)

Outputs are generated in:
- **`out/smoke_results.jsonl`** — raw model responses per image and arm.
- **`out/smoke_summary.md`** — confusion matrices, accuracy, precision, recall, agreement coverage, latency, and disagreement inspection list.

---

## 7. Running Unit & Integration Tests

Run the full Maven test suite:
```bash
./mvnw -q verify
```

To run individual test classes:
```bash
./mvnw test -Dtest=SeverityMapperTest
./mvnw test -Dtest=ResponseCacheTest
./mvnw test -Dtest=PromptLibraryTest
./mvnw test -Dtest=JsonParsingTest
./mvnw test -Dtest=ConfigValidationTest
./mvnw test -Dtest=ConcordanceCoreTest
```

---

## 8. Deploying to Google Cloud Run

To build and deploy the containerized service directly to Cloud Run:

```bash
source ~/fieldproof.env
./scripts/deploy.sh
```

The script builds the multi-stage Docker container via Cloud Build and deploys to Cloud Run with 1Gi RAM and the `fieldproof-run` service account.
Once deployed, test your live production URL:
```bash
curl -s https://<cloud-run-service-url>/api/health
```
