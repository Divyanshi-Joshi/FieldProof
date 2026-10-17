# 🌾 FieldProof : An Automated Crop Insurance Forensic Reconciliation Engine

[![Java 21](https://img.shields.io/badge/Java-21%20LTS-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot 3.4.4](https://img.shields.io/badge/Spring%20Boot-3.4.4-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Vertex AI](https://img.shields.io/badge/Google%20Cloud-Vertex%20AI%20%7C%20Gemini%203%20Flash-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/vertex-ai)
[![Google Earth Engine](https://img.shields.io/badge/Google%20Earth%20Engine-Sentinel--2%20%26%20CHIRPS-0F9D58?logo=google&logoColor=white)](https://earthengine.google.com/)
[![BigQuery](https://img.shields.io/badge/Google%20Cloud-BigQuery%20Audit%20Ledger-669DF6?logo=googlebigquery&logoColor=white)](https://cloud.google.com/bigquery)
[![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![React 18](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B%20(GEE)-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> **Mantra:** *"Gemini perceives and explains; deterministic Java decides; a human signs off."*

FieldProof is an AI-assisted parametric crop insurance reconciliation platform. It reconciles automated weather index data with farmer smartphone field photos and Sentinel-2 satellite NDVI anomaly evidence to resolve insurance basis-risk disputes in seconds with forensic accuracy.

---

## 📚 Essential Documentation Hub

| Document | Purpose |
|---|---|
| **[`ABLATION_STUDY.md`](ABLATION_STUDY.md)** | **Empirical Ablation Study & Evaluation Report.** 4-arm ablation metrics, risk-coverage trade-offs, planted fraud integrity, and unit economics. |
| **[`FEATURES.md`](FEATURES.md)** | **Exhaustive Feature & Architecture Guide.** Complete breakdown of Orbit-to-Field (GEE), Gemini Vision, Concordance Engine, Image Forensics, and Index Doctor. |
| **[`RUN_GUIDE.md`](RUN_GUIDE.md)** | **Start here to run the app.** Step-by-step instructions for running Backend, Frontend, Smoke Evaluation, and Cloud Run deployment. |
| **[`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md)** | **Deep-dive technical architecture.** Component breakdown, data flows, concordance matrix, and decision core specifications. |
| **[`USER_CHECKLIST.md`](USER_CHECKLIST.md)** | **Human operator checklist.** GCP project setup, ADC authentication, budget alerts, and dataset coordination with Person B. |
| **[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)** | **AI context handoff.** Complete record of implemented tasks, invariants, and directory mappings. |

---

## 🧰 Technology & Cloud Ecosystem

| Component / Layer | Technology | Role in FieldProof |
|---|---|---|
| **Multimodal Perception AI** | **Google Cloud Vertex AI / Gemini 3 Flash** | Calibrated concept-bottleneck vision grading of farmer smartphone photos with reference anchors. |
| **Orbit-to-Field Geospatial** | **Google Earth Engine (GEE)** | Dynamic 3-year baseline Sentinel-2 L2A (10m) NDVI anomaly calculation and CHIRPS rainfall verification. |
| **Immutable Audit Ledger** | **Google Cloud BigQuery** | Append-only audit trail logging every consensus decision, token spend, and human sign-off. |
| **Serverless Deployment** | **Google Cloud Run** | Scalable, containerized deployment of the Spring Boot reconciliation backend and static frontend. |
| **Deterministic Decision Core** | **Java 21 LTS & Spring Boot 3.4.4** | Pure Java rule engine, zero-hallucination payouts, SHA-256 caching, two-pass agreement gate. |
| **Image Forensics** | **Java 21 (ImageIntegrityTools)** | Intra-bundle duplicate detection (pHash/dHash), screen recapture moiré detection, EXIF GPS fences. |
| **Interactive Dashboard** | **React 18, TypeScript, Tailwind CSS** | High-density adjuster cockpit, visual claim inspection, Orbit Deep-Dive GEE modal, Index Doctor. |
| **Geospatial Connector** | **Python 3.10+ (`earthengine-api`)** | Standalone Python CLI and connector script for batch Earth Engine polygon analysis. |

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

## 🏛️ Architecture: The Orbit-to-Field Decision Core

```
  Farmer Smartphone Photos (1-3 images)          Farmer Plot Coordinates / GPS Polygon
                 │                                                │
                 ▼                                                ▼
  ┌──────────────────────────────┐              ┌──────────────────────────────────┐
  │ 1. Image Forensics Screen    │              │ Google Earth Engine & Geospatial │
  │   (ImageIntegrityTools)      │              │  • Sentinel-2 L2A 10m (B8/B4)    │
  └──────────────┬───────────────┘              │  • CHIRPS Daily Rainfall (0.05°) │
                 │                              │  • 3-Year Historical Baseline    │
                 ▼                              └─────────────────┬────────────────┘
  ┌──────────────────────────────┐                                │
  │ 2. Calibrated Vision Grading │                                │
  │     (GradingService)         │                                │
  │   Gemini 3 Flash via ADC     │                                │
  └──────────────┬───────────────┘                                │
                 │                                                │
                 ▼                                                ▼
     Observable Signs Vector                       Orbit Multi-Spectral Stress
  {leaf_rolling, canopy_senescence,               {ndvi_observed, baseline_mean,
   stunting, soil_cracking_visible}                ndvi_anomaly_z <= -1.5, dry_spell}
                 │                                                │
                 └───────────────────────┬────────────────────────┘
                                         ▼
                          ┌──────────────────────────────┐
                          │ 3. Deterministic Concordance │
                          │ (com.fieldproof.core Java 21)│
                          └──────────────┬───────────────┘
                                         ▼
                           1 of 8 Concordance Outcomes
  ┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
  ▼                              ▼                              ▼                              ▼
CONFIRMED_PAYOUT       PHENOLOGICAL_GAP               SPATIAL_GAP            POSSIBLE_OVERPAYMENT
 (Fast-Track)         (Escalate via §7.1.4)         (Escalate via §7.1.3)        (Manual Review)
```

### Core Invariants:
1. **Orbit-to-Field Corroboration:** Gemini perceives ground reality, while Google Earth Engine (`COPERNICUS/S2_SR_HARMONIZED` + `UCSB-CHG/CHIRPS/DAILY`) dynamically verifies orbit-level multi-spectral vegetation indices and dry-spell timing for the farmer's GPS coordinates.
2. **Zero Hallucination Payouts:** Gemini only perceives observable physical signs on a 0–3 integer scale. Deterministic pure Java code decides severity bands and payout actions.
3. **Calibrated Reference Anchors:** Gemini is always provided calibrated reference photos (healthy, moderate, severe) to anchor visual perception against camera and lighting drift.
4. **Two-Pass Agreement Gate:** Two passes with shuffled anchor orders must agree on the severity band; disagreements route to human adjusters (`ABSTAIN`).
5. **Reproducible SHA-256 Caching:** Model calls are cached by SHA-256 hash under `cache/`, enabling instant, zero-cost evaluation replays.

### 🛰️ Orbit-to-Field GEE Demonstration Command:
Test dynamic Google Earth Engine computation on the fly:
```bash
# Run standalone Earth Engine multi-spectral analysis for headline plot P-0142:
python scripts/orbit_to_field_gee.py --plot-id P-0142 --lat -1.8021 --lon 37.6253

# Or via 1-click script runner:
./scripts/run_gee_demo.ps1    # Windows PowerShell
./scripts/run_gee_demo.sh     # Linux / macOS
```

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
