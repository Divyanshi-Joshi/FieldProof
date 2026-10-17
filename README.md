# 🌾 FieldProof — Automated Crop Insurance Forensic Reconciliation Engine

[![Java 21](https://img.shields.io/badge/Java-21%20LTS-blue.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot 3.4.4](https://img.shields.io/badge/Spring%20Boot-3.4.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Vertex AI](https://img.shields.io/badge/Google%20Cloud-Vertex%20AI%20(ADC)-orange.svg)](https://cloud.google.com/vertex-ai)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20Tailwind-61dafb.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-Apache%202.0-lightgrey.svg)](LICENSE)

> **Mantra:** *"Gemini perceives and explains; deterministic Java decides; a human signs off."*

FieldProof is an AI-assisted parametric crop insurance reconciliation platform. It reconciles automated weather index data with farmer smartphone field photos and Sentinel-2 satellite NDVI anomaly evidence to resolve insurance basis-risk disputes in seconds with forensic accuracy.

---

## 📚 Essential Documentation Hub

| Document | Purpose |
|---|---|
| **[`RUN_GUIDE.md`](RUN_GUIDE.md)** | **Start here to run the app.** Step-by-step instructions for running Backend, Frontend, Smoke Evaluation, and Cloud Run deployment. |
| **[`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md)** | **Deep-dive technical architecture.** Component breakdown, data flows, concordance matrix, and decision core specifications. |
| **[`USER_CHECKLIST.md`](USER_CHECKLIST.md)** | **Human operator checklist.** GCP project setup, ADC authentication, budget alerts, and dataset coordination with Person B. |
| **[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)** | **AI context handoff.** Complete record of implemented tasks, invariants, and directory mappings. |

---

## ⚡ Quick Start (Run Locally)

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Java 21 LTS** (`java -version`)
- **Node.js 18+ & npm** (`node -v` and `npm -v`)
- **Google Cloud CLI (`gcloud`)** (`gcloud --version`)
- **Docker** (optional, for local container testing and Cloud Run: `docker --version`)

### 2. Project Setup & Authentication
In order to run Gemini vision inference, a **Google Cloud Project** is required to provision credentials and access Gemini models. FieldProof is calibrated and benchmarked on **`gemini-3-flash-preview`** (configured via `FIELDPROOF_GEMINI_MODEL`).

#### Step 2.1: Create Your Project & Obtain Credentials
1. Go to [Google AI Studio](https://aistudio.google.com/) or the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Google Cloud project (note your **Project ID**, e.g., `my-project-12345`).
3. Choose your authentication method below:

#### Method A: Gemini API Key via `.env` (Recommended for Local Dev)
1. Copy `.env.example` to `.env` in the repository root:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Project ID, API Key, and Model ID:
   ```env
   FIELDPROOF_GCP_PROJECT="<your-gcp-project-id>"
   GEMINI_API_KEY="your-gemini-api-key-here"
   FIELDPROOF_GEMINI_MODEL="gemini-3-flash-preview"
   FIELDPROOF_VERTEX_LOCATION="global"
   CR_REGION="asia-south1"
   ```
3. Load the environment configuration:
   - **Windows (PowerShell)**:
     ```powershell
     . .\setup-env.ps1
     ```
   - **Linux / macOS**:
     ```bash
     source setup-env.sh
     ```

#### Method B: Vertex AI via Application Default Credentials (ADC) (Production / Cloud Run)
Use this when running with a GCP service account or deploying to Google Cloud Run:
1. Authenticate with Google Cloud Application Default Credentials:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud auth application-default set-quota-project <your-gcp-project-id>
   ```
2. Export the required environment variables:
   - **Linux / macOS**:
     ```bash
     export FIELDPROOF_GCP_PROJECT="<your-gcp-project-id>"
     export FIELDPROOF_VERTEX_LOCATION="global"
     export FIELDPROOF_GEMINI_MODEL="gemini-3-flash-preview"
     export CR_REGION="asia-south1"
     ```
   - **Windows (PowerShell)**:
     ```powershell
     $env:FIELDPROOF_GCP_PROJECT="<your-gcp-project-id>"
     $env:FIELDPROOF_VERTEX_LOCATION="global"
     $env:FIELDPROOF_GEMINI_MODEL="gemini-3-flash-preview"
     $env:CR_REGION="asia-south1"
     ```

### 3. Start the Backend (Port 8080)
```bash
./mvnw spring-boot:run -pl backend
```
- Health check: `http://localhost:8080/api/health`
- Gemini ping: `http://localhost:8080/api/gemini/ping`
- Terminal logs will confirm live AI vision connections:
  `INFO ... Connecting to Gemini via GEMINI_API_KEY` (or Vertex AI mode)
  `INFO ... Dispatching Gemini vision grading for claim ...`

### 4. Start the Frontend (Port 5173)
```bash
# In another terminal window:
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🏛️ Architecture at a Glance

```
  Farmer Smartphone Photos (1-3 images)
                 │
                 ▼
  ┌──────────────────────────────┐
  │ 1. Image Forensics Screen    │ ──► [Duplicate pHash/dHash, EXIF, Screen Recapture]
  │   (ImageIntegrityTools)      │
  └──────────────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────┐
  │ 2. Calibrated Vision Grading │ ◄── [AnchorLibrary: Healthy, Moderate, Severe]
  │     (GradingService)         │ ◄── [Vertex AI Gemini 3 Flash via ADC]
  └──────────────────────────────┘
                 │
                 ▼
     Observable Signs Vector (0-3 scale)
  {leaf_rolling, canopy_senescence, stunting, soil_cracking}
                 │
                 ▼
  ┌──────────────────────────────┐
  │ 3. Deterministic Decision    │ ◄── [Weather Index: Rainfall vs Trigger]
  │ (SeverityMapper, Concordance)│ ◄── [Sentinel-2: Satellite NDVI Anomaly]
  └──────────────────────────────┘
                 │
                 ▼
   1 of 8 Concordance Outcomes
  ┌──────────────────────────────┬──────────────────────────────┐
  ▼                              ▼                              ▼
CONFIRMED_PAYOUT          BASIS_RISK_GAP               POSSIBLE_OVERPAYMENT
 (Fast-Track)              (Escalate)                    (Manual Review)
```

### Core Invariants:
1. **Zero Hallucination Payouts:** Gemini only perceives observable physical signs on a 0–3 integer scale. Deterministic pure Java code decides severity bands and payout actions.
2. **Calibrated Reference Anchors:** Gemini is always provided calibrated reference photos (healthy, moderate, severe) to anchor visual perception against camera and lighting drift.
3. **Two-Pass Agreement Gate:** Two passes with shuffled anchor orders must agree on the severity band; disagreements route to human adjusters (`ABSTAIN`).
4. **Reproducible SHA-256 Caching:** Model calls are cached by SHA-256 hash under `cache/`, enabling instant, zero-cost evaluation replays.

---

## 🛠️ Verification & Test Suite

Run the full Maven test suite:
```bash
./mvnw -q verify
```

### Test Suites Included:
- **`ConfigValidationTest`**: Validates fail-fast startup behavior on missing configuration.
- **`SeverityMapperTest`**: Verifies table-driven sign-to-band mappings.
- **`ResponseCacheTest`**: Verifies SHA-256 caching determinism and sensitivity.
- **`GeminiGatewayTest`**: Verifies gateway cache integration.
- **`PromptLibraryTest`**: Verifies template loading and dynamic label-map interpolation.
- **`GradingServiceTest`**: Verifies multi-image calls and pass-dependent anchor shuffling.
- **`JsonParsingTest`**: Verifies Jackson parsing of valid vs. malformed model outputs.
- **`ConcordanceCoreTest`**: Comprehensive verification of all 8 outcome branches and headline plot P-0142.

---

## 📊 Evaluation Runner (Profile: `smoke`)

Run the automated 4-arm ablation study on `data/dev30/labels.csv`:
```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=smoke
```
Outputs are written to:
- `out/smoke_results.jsonl` (raw JSON results)
- `out/smoke_summary.md` (confusion matrices, accuracy, precision, agreement coverage)

---

## 🚢 Google Cloud Run Deployment

Deploy the containerized service directly to Cloud Run:
```bash
./scripts/deploy.sh
```

---

## 📁 Repository Structure

```
FieldProof/
├── RUN_GUIDE.md              # Complete run guide for backend, frontend & deploy
├── TECHNICAL_ARCHITECTURE.md # Deep-dive technical architecture & specifications
├── USER_CHECKLIST.md         # Manual setup steps, GCP APIs, and action items
├── PROJECT_CONTEXT.md        # Ready-to-use AI context & implementation state
├── Dockerfile                # Multi-stage Temurin 21 build & runtime
├── contracts/                # JSON schemas and mock data for all contracts
├── protocol/                 # Immutability specifications (FROZEN_TRIGGER_PROTOCOL.md)
├── scripts/
│   └── deploy.sh             # Cloud Run deployment script
├── frontend/                 # React 18 + Vite + Tailwind CSS dashboard
└── src/
    ├── main/java/com/fieldproof/
    │   ├── ai/               # GeminiGateway, ResponseCache, PromptLibrary, GradingService
    │   ├── api/              # REST Controllers (Health, Claims, Doctor, Policy)
    │   ├── config/           # Properties & fail-fast validator
    │   ├── core/             # Pure Java decision engine (SeverityMapper, ConcordanceTable)
    │   ├── eval/             # Smoke evaluation runner
    │   └── tools/            # Image forensics, resizer, and Index Doctor service
    └── test/java/com/fieldproof/
```
