# 🏛️ FieldProof — Technical Architecture & Implementation Deep-Dive

> **Audience:** Engineers, architects, judges, and AI agents collaborating on FieldProof.  
> **Key Mantra:** *"Gemini perceives and explains; deterministic Java decides; a human signs off."*

---

## 1. Problem Formulation & Domain Context

### 1.1 The Vulnerability in Parametric Index Insurance
In developing agricultural economies (e.g. Kenya, India), traditional loss-adjustment is cost-prohibitive: sending an inspector to millions of 1-acre smallholder farms costs more than the policy itself.

Insurers therefore use **Parametric Weather-Index Insurance**:
- Payouts trigger automatically when an area weather station or satellite grid records seasonal rainfall below an agreed statistical trigger (e.g., the 30th percentile).

### 1.2 The Two Fatal Failure Modes:
1. **Basis-Risk False Negatives (The Disputed Denial):**
   - *Phenological Basis-Risk:* Seasonal rainfall exceeds the trigger (e.g. 341 mm vs. 290 mm trigger), so the index pays **$0**. However, a 21-day dry spell coincided precisely with the crop's flowering/tasseling window, causing complete yield collapse.
   - *Spatial Basis-Risk:* A convective storm hits the automated weather station 25 km away, registering normal rainfall, while the farmer's plot 10 km away received zero rain.
2. **Basis-Risk False Positives (Overpayment / Moral Hazard):**
   - The weather station triggers a payout, but a specific plot had access to borehole irrigation or micro-climate moisture, resulting in undamaged crops.
3. **Non-Weather Losses:**
   - Fall Armyworm, fungal blight, or weed infestation destroyed the crop; the farmer claims drought, but the weather index shows sufficient rainfall.

FieldProof resolves these disputes in seconds with forensic evidence rather than 45 days of bureaucratic delay.

---

## 2. Core Design Philosophy & Architectural Invariants

| Principle | Implementation Rule | Why It Matters |
|---|---|---|
| **Deterministic Decision Core** | Zero AI in payout rules, severity bands, or trigger calculations. Pure Java 21 only. | Eliminates LLM hallucination in financial decisions; complies with insurance regulatory auditability. |
| **Calibrated Anchored Vision** | Gemini receives 3 visual references (healthy, moderate, severe) prepended to the claim photos. | Prevents model drift across lighting, phone cameras, and soil tones. |
| **Two-Pass Agreement Gate** | Two independent passes with anchor presentation order deterministically shuffled. Disagreement routes to human adjuster (`ABSTAIN`). | Maximizes precision on the auto-approved subset and bounds hallucination risks. |
| **Enterprise ADC Auth** | Vertex AI via Application Default Credentials (ADC). Zero hardcoded API keys. | Uniform auth path for local development, Cloud Build, and Cloud Run. |
| **Reproducibility & Zero-Cost Re-evaluation** | File-based JSON caching (`ResponseCache`) keyed by SHA-256 of `(model, promptVersion, imageHashes, anchorOrder, pass)`. | Cache hits cost $0 and execute in 0 ms; enables instant ablation replays. |

---

## 3. High-Level Architecture & End-to-End Data Flow

```
   Farmer Smartphone Photo Bundle (1-3 images)
                        │
                        ▼
       ┌─────────────────────────────────┐
       │   1. Image Integrity Screening  │ ──► [Duplicate Fraud / Screen Recapture / EXIF]
       │       (ImageIntegrityTools)     │
       └─────────────────────────────────┘
                        │
                        ▼
       ┌─────────────────────────────────┐
       │   2. Calibrated Vision Grading  │ ◄── [AnchorLibrary: Healthy, Moderate, Severe]
       │          (GradingService)       │ ◄── [Vertex AI Gemini 3 Flash via ADC]
       └─────────────────────────────────┘
                        │
                        ▼
          Observable Signs Vector (0-3 scale)
          {leaf_rolling, canopy_senescence, stunting, soil_cracking}
                        │
                        ▼
       ┌─────────────────────────────────┐
       │   3. Deterministic Decision Core│ ◄── [Weather Station / Rainfall Index]
       │ (SeverityMapper, Concordance)   │ ◄── [Sentinel-2 Satellite NDVI Anomaly]
       └─────────────────────────────────┘
                        │
                        ▼
      Concordance Result (1 of 8 Outcome Classes)
   ┌────────────────────┬────────────────────┬────────────────────┐
   ▼                    ▼                    ▼                    ▼
Confirmed Payout   Basis-Risk Gap       Overpayment       Advisory / Abstain
(Fast-Track)        (Escalate)           (Review)          (Human Review)
```

---

## 4. Deep-Dive Component Architecture

### 4.1 Configuration Layer (`com.fieldproof.config`)
- **`FieldProofProperties`**: Immutable Java record mapped via `@ConfigurationProperties("fieldproof")`.
  - Nested sub-records: `Gcp(projectId, vertexLocation)`, `Gemini(model, temperature, thinkingLevel, mediaResolution, maxConcurrency, maxRetries)`, `Pricing`, `Cache`.
- **`FieldProofConfigValidator`**: Component that validates mandatory environment variables at boot. If missing, it immediately aborts startup with a prominent ASCII diagnostic banner detailing exact variables to set.

### 4.2 Pure Java Decision Core (`com.fieldproof.core`)
> **Invariant Rule:** Zero imports from Spring, Google GenAI SDK, or external network libraries. Pure, deterministic Java.

- **`Signs`**: Record scoring observable physical signs on a strict 0–3 integer scale:
  - `leafRolling0to3`: Curled or folded lengthwise.
  - `canopySenescence0to3`: Yellowing, browning, or drying across canopy.
  - `stunting0to3`: Short stature or patchy stand vs reference.
  - `soilCrackingVisible`: Boolean flag for dry surface fissures.
- **`SeverityMapper`**: Table-driven function mapping `Signs` to `SeverityBand`:
  - **SEVERE**: At least two signs score ≥ 2.
  - **MODERATE**: Exactly one sign scores ≥ 2.
  - **MILD**: No sign scores ≥ 2, but at least one sign scores ≥ 1.
  - **NONE**: All three signs score 0.
- **`TriggerRule`**: Computes parametric rainfall percentile and determines if the weather index triggers a payout.
- **`ConcordanceTable`**: Cross-references:
  1. Weather Index Outcome (`PAYS` vs `DOES_NOT_PAY`).
  2. Photo Severity Band (`SEVERE`, `MODERATE`, `MILD`, `NONE`, or `ABSTAIN`).
  3. Satellite NDVI Anomaly (`STRESSED` vs `NORMAL`).

#### The 8 Concordance Outcome Classes:
| Outcome Class | Weather Index | Photo Band | Satellite NDVI | Recommended Action |
|---|---|---|---|---|
| **`CONFIRMED_PAYOUT`** | Pays | MODERATE / SEVERE | Stressed / Normal | **FAST_TRACK** (Instant payout) |
| **`PHENOLOGICAL_BASIS_RISK_GAP`** | No Pay | MODERATE / SEVERE | Stressed | **ESCALATE** (Senior adjuster review) |
| **`SPATIAL_BASIS_RISK_GAP`** | No Pay | MODERATE / SEVERE | Normal | **ESCALATE** (Field-level micro-drought) |
| **`POSSIBLE_OVERPAYMENT`** | Pays | NONE / MILD | Normal | **REVIEW** (Possible moral hazard) |
| **`EVIDENCE_CONFLICT`** | Pays | NONE / MILD | Stressed | **REVIEW** (Conflicting signals) |
| **`NON_WEATHER_LOSS`** | No Pay | Damaged (Pest/Weed) | Any | **ROUTE_TO_ADVISORY** (Agronomy guidance) |
| **`CONSISTENT`** | No Pay | NONE / MILD | Normal | **NO_ACTION** (Plot healthy, no claim) |
| **`INTEGRITY_HOLD`** | Any | Any | Any | **HOLD_NO_RECOMMENDATION** (Fraud detected) |
| **`ABSTAIN`** | Any | Disagreeing Passes | Any | **ABSTAIN_TO_HUMAN** (Loss adjuster triage) |

### 4.3 AI & Vision Gateway (`com.fieldproof.ai`)
- **`GeminiGateway`**: Vertex AI gateway utilizing Google GenAI Java SDK (1.78.0).
  - Concurrency limited via `Semaphore` to prevent quota exhaustion.
  - Automatic exponential backoff + jitter on HTTP 429 and 5xx errors.
  - Jackson deserialization into target records with single-retry on parse failure.
- **`ResponseCache`**: SHA-256 file-based caching under `cache/`. Cache keys are computed from model ID, prompt version, ordered SHA-256 hashes of input images, anchor permutation order, and pass index.
- **`PromptLibrary`**: Thread-safe manager for versioned prompt templates (`grading_raw_v0.txt` and `grading_signs_v1.txt`) and externalized damage types (`config/label-map.yml`).
- **`AnchorLibrary`**: Manages the 3 reference images (healthy, moderate, severe). Shuffles presentation order deterministically based on pass index (`seed = pass * 31337 + 7919`).
- **`GradingService`**: Orchestrator that accepts 1 to 3 claim photos, prepends shuffled reference anchors, downscales images via `ImageResizer`, dispatches the Gemini call, and computes the deterministic severity band.

### 4.4 Image Forensics & Integrity Tools (`com.fieldproof.tools`)
- **`ImageIntegrityTools`**:
  - **Perceptual Hashing (dHash)**: 64-bit difference hashing to detect identical or edited photos submitted across different plots or claims.
  - **EXIF Analysis**: Validates capture timestamp and GPS coordinates against policy plot bounds.
  - **Screen Recapture Detection**: Flags photographs of computer monitors or printed photographs.
- **`ImageResizer`**: Uses Java `ImageIO` and bilinear interpolation to downscale large smartphone photos to max 768 px on the long edge, saving up to 75% of multimodal tokens and network payload.
- **`IndexDoctorService`**: Simulates historical rainfall distributions across triggers from 5% to 60%, computing the Pareto frontier between basis-risk false negatives and insurer payout budget.

### 4.5 Evaluation & Ablation Suite (`com.fieldproof.eval`)
- **`SmokeTestRunner`**: Activated via `--spring.profiles.active=smoke`.
  - Runs all 4 experimental arms on `data/dev30/labels.csv`:
    - Arm 1: Raw prompt baseline (1 pass)
    - Arm 2: Signs rubric without anchors (1 pass)
    - Arm 3: Signs rubric with anchors (pass 1)
    - Arm 4: Signs rubric with anchors (pass 2, shuffled anchors)
  - Outputs full audit logs in `out/smoke_results.jsonl` and formatted summary report in `out/smoke_summary.md`.

---

## 5. Frontend Architecture (React + Vite + Tailwind CSS)

The frontend resides in `frontend/` and communicates with the backend via Vite proxy (`/api` -> `http://localhost:8080`).

### Component Hierarchy:
- **`HeroLanding.tsx`**: System introduction, persona selector, and high-level architecture diagram.
- **`FarmerView.tsx`**: Mobile-optimized claim upload flow with instant camera feed, image integrity validation, and multilingual status updates in English, Hindi, and Swahili.
- **`InsurerView.tsx`**: Comprehensive Loss Adjuster Cockpit displaying the 3-signal concordance matrix, full policy clause citations (§4.2.1, §5.3, §7.1.4), and interactive one-click sign-off.
- **`IndexDoctorView.tsx`**: Interactive policy recalibration dashboard featuring an adjustable rainfall percentile slider, dynamic confusion matrix recalculation, and budget impact forecasting.
- **`ValidationView.tsx`**: Displays the 4-arm ablation metrics, agreement coverage curves, and unit economics ($0.0028 per claim check).

---

## 6. Type Safety & Contract Immutability

FieldProof enforces JSON Schema contracts located in `contracts/`:
- **`GradingResult.schema.json`**: Forensics & Gemini vision grading result.
- **`EvidenceRecord.schema.json`**: Weather index and satellite NDVI evidence bundle.
- **`ClaimDecision.schema.json`**: Adjudication outcome, policy citations, and adjuster brief.
- **`AuditRecord.schema.json`**: Tamper-evident regulatory audit trail.

Java DTOs in `com.fieldproof.api.dto.Contracts` are generated from these schemas to guarantee zero serialization divergence.
Immutability rules are documented in `protocol/FROZEN_TRIGGER_PROTOCOL.md` and locked via `protocol/COMMIT_HASH.txt`.

---

## 7. Build, Verification & Testing Matrix

| Test Suite | Purpose |
|---|---|
| **`ConfigValidationTest`** | Verifies fail-fast startup behavior when required GCP/Gemini properties are missing or blank. |
| **`SeverityMapperTest`** | Verifies all boundary conditions for sign vectors ((3,2,1)→SEVERE, (2,2,0)→SEVERE, (2,1,1)→MODERATE, (3,0,0)→MODERATE, (1,1,1)→MILD, (0,0,0)→NONE). |
| **`ConcordanceCoreTest`** | Comprehensive 600+ line test verifying every branch of the ConcordanceTable and headline plot P-0142. |
| **`ResponseCacheTest`** | Proves deterministic cache hits and sensitivity to model, prompt, pass, and anchor permutations. |
| **`GeminiGatewayTest`** | Verifies gateway cache integration and parameter delegation. |
| **`PromptLibraryTest`** | Verifies template loading and dynamic label-map interpolation. |
| **`GradingServiceTest`** | Verifies multi-image bundling, pass-dependent anchor shuffling, and deterministic band mapping. |
| **`JsonParsingTest`** | Tests Jackson parsing of valid recorded Gemini responses and rejection of malformed outputs. |

To verify all test suites:
```bash
./mvnw -q verify
```

---

## 8. Modular Project Structure

```text
FieldProof/
├── backend/                  # Spring Boot 3.4.4 (Java 21 LTS) Service
│   ├── src/main/java/com/fieldproof/
│   │   ├── ai/               # GeminiGateway, ResponseCache, PromptLibrary, GradingService, AnchorLibrary
│   │   ├── api/              # REST Controllers (Health, Claims, Doctor, Policy) & DTOs
│   │   ├── config/           # FieldProofProperties & FieldProofConfigValidator
│   │   ├── core/             # Pure Java Deterministic Decision Core (SeverityMapper, ConcordanceTable)
│   │   ├── eval/             # SmokeTestRunner (4-arm ablation evaluation)
│   │   ├── service/          # Data loaders & business orchestration
│   │   └── tools/            # ImageIntegrityTools, ImageResizer, IndexDoctorService
│   ├── src/main/resources/   # application.yml, prompts/, config/label-map.yml
│   ├── src/test/java/        # 8 comprehensive unit test suites
│   └── pom.xml               # Backend Maven module descriptor
│
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS Cockpit
│   ├── src/components/       # HeroLanding, FarmerView, InsurerView, IndexDoctorView, ValidationView
│   ├── vite.config.ts        # Vite dev proxy (/api -> http://localhost:8080)
│   └── package.json          # Frontend dependencies & scripts
│
├── contracts/                # Shared JSON Schemas & Golden Mock Data Bundles
├── data/                     # Plot Evidence, Evaluation Images (dev30), Reference Anchors
├── policy/                   # Illustrative Policy Clauses & Text Index
├── protocol/                 # Regulatory Immutability & Frozen Trigger Protocol
├── scripts/                  # start.sh, deploy.sh
├── docs/                     # Specifications, Checklists, & Task Plans
├── Dockerfile                # Multi-stage Temurin 21 Container Build
└── pom.xml                   # Root Multi-Module Parent POM
```
