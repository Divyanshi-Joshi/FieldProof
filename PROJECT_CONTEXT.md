# FieldProof — Project Context & Implementation State

> **Notice for AI Assistants:** This document contains the complete context, design invariants, architecture decisions, and current implementation status of FieldProof. Use this to immediately resume or extend work without hallucinating patterns or breaking existing code.

---

## 1. Project Overview & Architecture

**FieldProof** is an automated crop insurance verification and forensic adjudication engine. It pairs satellite weather index data (rainfall, dry-spells, NDVI) with farmer-uploaded smartphone field photos graded by Gemini models on Google Cloud Vertex AI.

### Core Architectural Invariants:
1. **Deterministic Java Decision Core:**
   - **Gemini NEVER decides claims, payouts, or severity bands directly.**
   - Gemini only scores observable physical signs (0 to 3 scale) and extracts flags.
   - Tested, 100% pure Java code (`SeverityMapper`, `SeverityBand`, `TriggerRule`, `ConcordanceTable`) deterministically maps sign vectors into severity bands and insurance outcomes.
2. **Cloud & AI Authentication:**
   - Uses Google GenAI Java SDK (`com.google.genai:google-genai:1.78.0`) in Vertex AI mode with **Application Default Credentials (ADC)**.
   - Zero hard-coded API keys in code or production configs.
3. **Reproducibility & Cost Control:**
   - File-based JSON caching (`ResponseCache`) keyed by the SHA-256 hash of model ID, prompt version, ordered image hashes, anchor order, and pass number.
   - Concurrency bounded via Semaphore; exponential backoff + jitter on HTTP 429/5xx.
4. **Technology Stack:**
   - **Java 21 LTS**, Maven Wrapper (`./mvnw`).
   - **Spring Boot 3.4.4** (latest stable GA).
   - Multi-stage Docker container deployed to **Google Cloud Run**.

---

## 2. Repository Layout

```
FieldProof/
├── .dockerignore
├── .gitignore
├── Dockerfile                   # Multi-stage Temurin 21 container build & runtime
├── pom.xml                      # Multi-module parent POM
├── GEMINI.md                    # Agent coding rules and guidelines
├── USER_CHECKLIST.md            # Action items for human operator (Person A)
├── PROJECT_CONTEXT.md           # This document (AI context handoff)
├── RUN_GUIDE.md                 # Full run instructions (Backend, Frontend, Cloud Run)
├── TECHNICAL_ARCHITECTURE.md    # In-depth architectural blueprint
├── backend/                     # Spring Boot 3.4.4 (Java 21 LTS) Service
│   ├── pom.xml
│   ├── src/main/java/com/fieldproof/
│   │   ├── FieldProofApplication.java
│   │   ├── ai/                  # Gemini Gateway, Response Cache, Prompt & Anchor libraries (T7-T9)
│   │   ├── api/                 # REST Controllers (Health, Claims, Doctor, Policy) & Contracts DTOs
│   │   ├── config/              # FieldProofProperties & FieldProofConfigValidator (T2)
│   │   ├── core/                # Pure Java Decision Core (Signs, SeverityMapper, ConcordanceTable) (T6)
│   │   ├── eval/                # SmokeTestRunner (T10)
│   │   ├── service/             # Data loaders & business orchestration
│   │   └── tools/               # Image forensics, resizer, and Index Doctor service
│   ├── src/main/resources/      # application.yml, prompts/, config/label-map.yml
│   └── src/test/java/           # 8 test suites (SeverityMapper, ResponseCache, Concordance, etc.)
├── frontend/                    # React 18 + Vite + Tailwind CSS Cockpit
│   ├── src/components/          # HeroLanding, FarmerView, InsurerView, IndexDoctorView, ValidationView
│   ├── vite.config.ts           # Dev proxy (/api -> http://localhost:8080)
│   └── package.json
├── contracts/                   # JSON schemas and golden mock payloads for all contracts
├── protocol/                    # Specification documents (e.g. FROZEN_TRIGGER_PROTOCOL.md)
├── policy/                      # Policy texts and illustrative clauses
├── data/                        # Plot evidence CSVs, evaluation images (dev30), reference anchors
└── scripts/                     # start.sh, deploy.sh
```

---

## 3. Tasks Completed to Date

### Task T1: Project Scaffolding & Dependencies
- Maven project initialized with Java 21 and Spring Boot 3.4.4.
- `pom.xml` configured with `google-genai` (1.78.0), Jackson 2.18, Spring Boot Starter Web, Validation, and JUnit 5.
- Package layout established (`config`, `api`, `ai`, `core`, `eval`).
- `.gitignore` and `.dockerignore` configured to exclude `data/`, `cache/`, `target/`, and secret env files.

### Task T2: Configuration & Validation
- **[`FieldProofProperties.java`](backend/src/main/java/com/fieldproof/config/FieldProofProperties.java)**:
  - Java record bound via `@ConfigurationProperties("fieldproof")` from `application.yml`.
  - Nested records: `Gcp`, `Gemini`, `Pricing`, `Cache`.
  - Maps `FIELDPROOF_GCP_PROJECT`, `FIELDPROOF_VERTEX_LOCATION`, `FIELDPROOF_GEMINI_MODEL`, `PORT`, etc.
- **[`FieldProofConfigValidator.java`](backend/src/main/java/com/fieldproof/config/FieldProofConfigValidator.java)**:
  - Validates required properties at application boot.
  - Fails fast with a distinct ASCII error box if any required env var is blank or missing.
- **[`ConfigValidationTest.java`](backend/src/test/java/com/fieldproof/config/ConfigValidationTest.java)**:
  - Pure Java unit test verifying rejection of missing, null, or whitespace-only configurations.

### Task T3: Health & Ping Endpoints
- **[`HealthController.java`](backend/src/main/java/com/fieldproof/api/HealthController.java)**:
  - `GET /api/health` returns `{status: "UP", model: "...", vertexLocation: "...", buildTime: "..."}`.
  - Never calls Gemini; safe for liveness/readiness probes.
- **[`GeminiPingController.java`](backend/src/main/java/com/fieldproof/api/GeminiPingController.java)**:
  - `GET /api/gemini/ping` tests Vertex AI connectivity with `"Reply with the single word OK"`.
  - Returns model response text, latency in ms, and model ID.
  - Clearly tagged for removal before hackathon submission.

### Task T4: Dockerfile
- **[`Dockerfile`](Dockerfile)**:
  - Stage 1: `eclipse-temurin:21-jdk` caches dependencies and packages the fat JAR (`./mvnw -q -DskipTests package -pl backend`).
  - Stage 2: `eclipse-temurin:21-jre` runtime image.
  - Injects `ENV PORT=8080`, exposes `${PORT}`, runs `java -jar app.jar`.
  - Copies `contracts/`, `protocol/`, and `policy/` data required by offline mock services.

### Task T5: Cloud Run Deployment Script
- **[`scripts/deploy.sh`](scripts/deploy.sh)**:
  - Sources `~/fieldproof.env` if present.
  - Validates required env vars (`PROJECT_ID`, `CR_REGION`, `VERTEX_LOCATION`, `GEMINI_MODEL`).
  - Runs `gcloud run deploy fieldproof --source . --region $CR_REGION ...` with 1Gi RAM and assigned service account.

### Task T6: Core Domain DTOs & SeverityMapper (Pure Java)
- **[`Signs.java`](backend/src/main/java/com/fieldproof/core/Signs.java)**:
  - Record: `leafRolling0to3`, `canopySenescence0to3`, `stunting0to3`, `soilCrackingVisible`.
  - Validates each integer sign is strictly 0–3.
- **[`GradingResult.java`](backend/src/main/java/com/fieldproof/core/GradingResult.java)**:
  - Record representing raw Gemini output for a grading pass: `isCropField`, `sameFieldAcrossPhotos`, `screenRecaptureSuspected`, `crop`, `growthStage`, `signs`, `damageType`, `confidence`, `visibleEvidence`, `photoQualityFlags`.
- **[`SeverityMapper.java`](backend/src/main/java/com/fieldproof/core/SeverityMapper.java)**:
  - Table-driven mapper per Day 1 specification:
    - **SEVERE**: at least two signs ≥ 2.
    - **MODERATE**: exactly one sign ≥ 2.
    - **MILD**: no sign ≥ 2, but at least one sign ≥ 1.
    - **NONE**: all three signs score 0.
    - Soil cracking is a reported flag only (does not elevate band under Day 1 rules).
- **[`SeverityMapperTest.java`](backend/src/test/java/com/fieldproof/core/SeverityMapperTest.java)**:
  - Verifies (3,2,1)→SEVERE, (2,2,0)→SEVERE, (2,1,1)→MODERATE, (3,0,0)→MODERATE, (1,1,1)→MILD, (0,0,0)→NONE, out-of-bounds scores throw `IllegalArgumentException`.

---

## 4. Current Build & Test Status

Run the test suite at any time:
```bash
./mvnw -q verify
```
**Current Status:** Build passes with exit code 0. All 17+ unit tests in `ConfigValidationTest`, `SeverityMapperTest`, and `ConcordanceCoreTest` pass cleanly.

---

### Task T7: Gemini Gateway & Response Cache (`ai/`)
- **[`ResponseCache.java`](backend/src/main/java/com/fieldproof/ai/ResponseCache.java)**:
  - File-based JSON caching under `cache.dir` (default `cache/`).
  - Key: SHA-256 hex of `(model | promptVersion | orderedImageHashes | anchorOrder | pass)`.
  - Cache hits return immediate results with `fromCache = true` and 0 ms latency.
- **[`GeminiGateway.java`](backend/src/main/java/com/fieldproof/ai/GeminiGateway.java)**:
  - Calls Vertex AI Gemini via Google GenAI SDK with ADC.
  - Limits concurrency via `Semaphore` (`gemini.max-concurrency`).
  - Retries HTTP 429 and 5xx errors with exponential backoff and random jitter (`gemini.max-retries`).
  - Validates JSON output with Jackson into `responseSchemaClass`, retrying once on parse failure and recording cumulative parse failures.
- **[`ResponseCacheTest.java`](backend/src/test/java/com/fieldproof/ai/ResponseCacheTest.java)** & **[`GeminiGatewayTest.java`](backend/src/test/java/com/fieldproof/ai/GeminiGatewayTest.java)**:
  - Tests cache hit determinism, cache misses when pass or anchor order differs, and gateway cache integration.

### Task T8: Prompts & Label Map (`src/main/resources/prompts/`)
- **[`grading_raw_v0.txt`](backend/src/main/resources/prompts/grading_raw_v0.txt)**:
  - Baseline raw prompt for ablation arm (b) (damaged boolean, damage_type, confidence).
- **[`grading_signs_v1.txt`](backend/src/main/resources/prompts/grading_signs_v1.txt)**:
  - Calibrated signs rubric per Day 1 Appendix (leaf rolling, canopy senescence, stunting, soil cracking).
- **[`label-map.yml`](backend/src/main/resources/config/label-map.yml)**:
  - Allowed damage types configuration (defaults to placeholders `none`, `other` until Person B confirms D6).
- **[`PromptLibrary.java`](backend/src/main/java/com/fieldproof/ai/PromptLibrary.java)** & **[`PromptLibraryTest.java`](backend/src/test/java/com/fieldproof/ai/PromptLibraryTest.java)**:
  - Thread-safe loader for versioned prompt templates and label map checks.

### Task T9: Calibrated Anchors & Grading Service (`ai/`)
- **[`AnchorLibrary.java`](backend/src/main/java/com/fieldproof/ai/AnchorLibrary.java)**:
  - Loads 3 reference images (healthy, moderate, severe) from `data/anchors/anchors.json`.
  - Deterministically shuffles anchor presentation order per pass seed (`seed = pass * 31337 + 7919`).
- **[`ImageResizer.java`](backend/src/main/java/com/fieldproof/tools/ImageResizer.java)**:
  - Downscales photos to max 768 px on the long edge using standard Java ImageIO to save bandwidth and tokens.
- **[`GradingService.java`](backend/src/main/java/com/fieldproof/ai/GradingService.java)** & **[`GradingServiceTest.java`](backend/src/test/java/com/fieldproof/ai/GradingServiceTest.java)**:
  - Builds multi-image calls with 3 anchors first (if enabled), then claim photos.
  - Supports 1 to 3 claim photos (single images or bundles).
  - Automatically computes deterministic `SeverityBand` from Gemini signs via `SeverityMapper`.

### Task T10: Smoke Test Evaluation Runner (`eval/`, Profile `smoke`)
- **[`SmokeTestRunner.java`](backend/src/main/java/com/fieldproof/eval/SmokeTestRunner.java)**:
  - `CommandLineRunner` triggered via `--spring.profiles.active=smoke`.
  - Reads `data/dev30/labels.csv` using Apache Commons CSV.
  - Evaluates 4 arms per image:
    1. Raw prompt, 1 pass
    2. Signs rubric without anchors, 1 pass
    3. Signs rubric with anchors, pass 1
    4. Signs rubric with anchors, pass 2 (shuffled anchors)
  - Computes confusion matrix, accuracy, precision, and recall for both MILD+ and MODERATE+ thresholds.
  - Computes two-pass agreement coverage and accuracy on the agreeing subset.
  - Writes outputs to `out/smoke_results.jsonl` and formatted report `out/smoke_summary.md` (including disagreement table for Step O12 inspection).

---

## 4. Current Build & Test Status

Run the test suite at any time:
```bash
./mvnw -q verify
```
**Current Status:** Build passes with exit code 0. All unit test suites pass cleanly:
- `ConfigValidationTest`
- `SeverityMapperTest`
- `ConcordanceCoreTest`
- `ResponseCacheTest`
- `GeminiGatewayTest`
- `PromptLibraryTest`
- `GradingServiceTest`

---

## 5. Upcoming Tasks (Roadmap to Gate 1)

1. **Task T11: Complete Test Suite Verification**:
   - Comprehensive test assertions for JSON malformed retries and response parsing error logging.
2. **Task T12: Schema & Contract Sync**:
   - Verify `contracts/*.schema.json` align with final implementation records.
3. **Execution with Dataset**:
   - Once Person B provides `data/dev30/` and `data/anchors/`, run:
     ```bash
     ./mvnw spring-boot:run -Dspring-boot.run.profiles=smoke
     ```

