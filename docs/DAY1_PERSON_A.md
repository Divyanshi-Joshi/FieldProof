# Person A, Day 1 (Thu Oct 15) implementation plan: foundations and first Gemini test

Reference for Person A and for the AI coding agent (Antigravity / Gemini Code Assist). Save as `docs/DAY1_PERSON_A.md` in the repo. Section 3 is manual work done outside the IDE. Section 4 is work handed to the agent, one task at a time. Anything undecided is an open item in section 2; nothing in this plan fills those in silently.

## 1. Goal for tonight and the Gate 1 rule

By the end of tonight:

1. A live Cloud Run URL serving a Spring Boot service.
2. Valid, schema-conforming JSON from Gemini on real crop photos.
3. A rough damaged-vs-not accuracy number on about 30 development images, plus the agreement rate between two anchored passes.

**Gate 1 rule:** if development accuracy is below about 65% even with anchors, keep the idea and change the headline. Lead with precision at the agreement gate (coverage) and present Gemini as triage that abstains to humans.

Out of scope tonight: BigQuery tables (Person B), the three tool-calling agents, Index Doctor, the frontend, the policy brief, integrity tools.

## 2. Decisions and open items

### Decided

| Topic | Decision | Reason |
|---|---|---|
| Build tool | Maven with the Maven Wrapper (`./mvnw`) | Simplest Dockerfile, most predictable `pom.xml` for AI agents, no daemon |
| Java | Java 21 (LTS), installed (D4) | Records, long-term support |
| Package and group | `com.fieldproof` (D5) | Agreed |
| Spring Boot | Latest stable GA from start.spring.io, never a milestone or snapshot | Avoid pre-release surprises |
| Cloud Run region | India: proposed `asia-south1` (Mumbai); `asia-south2` (Delhi) is the alternative (D2) | Closest to you; confirm it appears in the Cloud Run region list in your console |
| Gemini access | Vertex AI via Application Default Credentials, no API key in code | One path for dev and production; project billing applies; avoids free-tier data use |
| Deploy method | `gcloud run deploy --source .` using our Dockerfile | Built by Cloud Build; Docker is installed, so you can also test the image locally |
| Service shape | One Spring Boot service now; React build added into it later | Matches the single Cloud Run service in the plan |
| Response cache | File-based JSON keyed by SHA-256 of model, prompt version, image hashes, anchor order, pass | Reused by Friday's ablation |
| AI coding tool | Antigravity / Gemini Code Assist; rules in `GEMINI.md` | If your tool does not load `GEMINI.md`, copy it to `AGENTS.md` |

### Open items

| ID | Question | Status | Why it matters |
|---|---|---|---|
| D1 | GCP project ID and billing account | **You will create it tonight (O2)** | Blocks everything in section 3 |
| D3 | Vertex location and Gemini model ID | **Explained and resolved in O7** | Blocks the first Gemini call |
| D6 | Dataset label schema, which labels count as damaged, real damage-type names | **To discuss with Person B** | Needed before any scored run and to fill `label-map.yml` |
| D7 | Do photos group into 3-photo bundles per plot and season, or single images? | Depends on D6 | Input shape of the smoke test |
| D8 | Approve the severity band rules in T6 (only SEVERE comes from our documents) | Open | Bands drive the whole decision table |
| D9 | Repo visibility during development (submission needs it public, no secrets) | Open | Dataset licence and image redistribution |
| D10 | BigQuery dataset location (agree with Person B) | Open | Cannot be changed after creation |

## 3. Part 1: outside the IDE (you do these by hand)

### O1. Check local tools (D4: you have JDK 21 and Docker)

```
java -version      # expect 21
docker --version
gcloud --version
git --version
```

If `gcloud` is missing, install the Google Cloud CLI before O4.

### O2. Create the project, billing, credit and alerts (D1)

1. In the Cloud Console create a new project and note its ID. This is your `PROJECT_ID`.
2. Link a billing account to it (a payment method is likely required).
3. Activate the Google AI Pro credit: open the Google Developer Program My Benefits page and link the credit to this billing account. The credit is personal to the subscriber, so this project must run under your billing account; Person B is added later as an editor.
4. Billing, Budgets and alerts: create alerts at $15 and $30 with email notifications.

### O3. Local environment file (never committed)

Create `~/fieldproof.env`. `GEMINI_MODEL` and `VERTEX_LOCATION` are filled in at O7.

```
export PROJECT_ID=<your project id from O2>
export CR_REGION=asia-south1
export VERTEX_LOCATION=<from O7>
export GEMINI_MODEL=<from O7>
```

Then run `source ~/fieldproof.env`.

### O4. Authenticate and enable APIs

```
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud auth application-default login
gcloud auth application-default set-quota-project $PROJECT_ID
gcloud services enable run.googleapis.com aiplatform.googleapis.com bigquery.googleapis.com storage.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

### O5. Runtime service account for Cloud Run

```
gcloud iam service-accounts create fieldproof-run --display-name='FieldProof Cloud Run'
for ROLE in roles/aiplatform.user roles/bigquery.dataEditor roles/bigquery.jobUser roles/storage.objectAdmin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:fieldproof-run@$PROJECT_ID.iam.gserviceaccount.com --role=$ROLE
done
```

### O6. Image bucket

```
gcloud storage buckets create gs://$PROJECT_ID-fieldproof-images --location=$CR_REGION --uniform-bucket-level-access
```

Not used by tonight's code; creating it now avoids a stop on Friday.

### O7. Resolve D3: Vertex location and Gemini model ID

**What this is.** Calling Gemini on Vertex AI needs two exact values:

- **Model ID**: the precise name of the model, for example `gemini-3-flash-preview`. A wrong or retired ID returns a 404.
- **Vertex location**: where Google serves the model from. Some models are available in regional locations (for example `asia-south1`), but newer Gemini 3 preview models may be served only from the location called `global`. This is separate from your Cloud Run region. Cloud Run can sit in Mumbai while Gemini is called through `global`; that works.

**Why it matters.** Google's Vertex AI lifecycle page lists Gemini 2.5 models with retirement dates around Oct 16 to 20, 2026, which overlaps the hackathon. Do not pin a `gemini-2.5-*` model. Preview models can also change.

**What to do:**

1. In the Cloud Console open Vertex AI, then Model Garden, and search for Gemini. Look for the current Flash-class models (fast and cheap enough for about 1,400 calls).
2. Open the model versions and lifecycle page in the Vertex AI documentation and note the retirement date for the model you choose. Pick one that is not retiring before Oct 19.
3. Start with this candidate list, in this order, and keep the first one that passes the test in step 4. These names came from public documentation and third-party catalogues, not from your project, so they are candidates to test and not confirmed:
   - `gemini-3-flash-preview` with location `global`
   - `gemini-3.1-flash-lite-preview` with location `global`
   - whichever current Flash model Model Garden shows for your project
4. Test it from the shell:

```
cat > /tmp/req.json <<'EOF'
{"contents":[{"role":"user","parts":[{"text":"Reply with the single word OK"}]}]}
EOF

# global location:
curl -s -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H 'Content-Type: application/json' -d @/tmp/req.json "https://aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/global/publishers/google/models/$GEMINI_MODEL:generateContent"

# regional location (use instead if your model is regional):
# https://$VERTEX_LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/$VERTEX_LOCATION/publishers/google/models/$GEMINI_MODEL:generateContent
```

5. Expected result: JSON containing `OK`. A 404 means the model ID or location is wrong or the model is retired; try the next candidate. A 403 means the API or your permissions are not ready; recheck O4.
6. Write the working values into `~/fieldproof.env` and note the model ID, location and retirement date in a text file for Friday and Sunday rechecks.

### O8. Create the repository

Create a GitHub repo named `fieldproof` (visibility per D9, still open) and clone it. Add Person B as a collaborator. Copy `GEMINI.md` to the repo root and this file to `docs/DAY1_PERSON_A.md`. Keep keys, `~/fieldproof.env`, images and caches out of git.

### O9. Get the 30 development images from Person B

Agree this exact hand-over (the label columns depend on D6):

- A folder `data/dev30/` containing the image files, never committed.
- A file `data/dev30/labels.csv` with columns `image_id,file_name,damaged,damage_type,plot_id,season,county`.
- The set excludes the 3 anchor images and is stratified across damage classes.

### O10. Choose the 3 anchors with Person B

One clear healthy, one moderate and one severe image from the development set, each unambiguous to a human. Record them in `data/anchors/anchors.json` as a list of objects with `level` and `file`. They are excluded from every test and evaluation set from now on.

### O11. Deploy and verify the first build

After task T5, run `./scripts/deploy.sh`, then open the printed URL plus `/api/health` on a laptop and on your phone. If the build fails with a permission error naming a service account, grant that account `roles/cloudbuild.builds.builder` and `roles/artifactregistry.writer` and retry. If the deploy is refused because of an organization policy on public access, send the exact message; do not work around it by guessing.

### O12. Read the failures by hand

After each scored run, open the 10 worst images beside the model's JSON and tag each failure as: bad label, blurry or unusable photo, ambiguous damage, or rubric problem. Only rubric problems justify a prompt change, and every prompt change counts toward the limit of two rubric revisions before Friday's freeze.

## 4. Part 2: in the IDE (the agent builds these)

### How to drive the agent

Paste this at the start of each task, changing only the task ID:

> Read `GEMINI.md` and `docs/DAY1_PERSON_A.md`. Implement task T<n> only. Do not touch files outside that task. If anything is unclear or an open item (D6 to D10) blocks you, stop and ask me instead of assuming. Run `./mvnw -q verify` and show me the output before you say you are done.

### T0. Rules file

`GEMINI.md` is already written (repo root). Confirm your tool loads it; if not, copy it to `AGENTS.md`.

### T1. Scaffold the project

- Maven project, Java 21, group `com.fieldproof`, artifact `fieldproof`, base package `com.fieldproof`, Maven Wrapper committed.
- Dependencies exactly as allowed in `GEMINI.md`. Latest stable Spring Boot GA.
- Package layout: `config/`, `api/`, `ai/`, `core/`, `eval/`.
- `.gitignore` covering `target/`, `data/`, `cache/`, `out/`, `*.env`, IDE folders. `.dockerignore` covering the same plus `.git`.
- **Done when:** `./mvnw -q verify` passes and `./mvnw spring-boot:run` starts.

### T2. Configuration

A `FieldProofProperties` record bound with `@ConfigurationProperties("fieldproof")` from `application.yml`, every value overridable by environment variable:

| Property | Env variable | Notes |
|---|---|---|
| `gcp.project-id` | `FIELDPROOF_GCP_PROJECT` | required |
| `gcp.vertex-location` | `FIELDPROOF_VERTEX_LOCATION` | required |
| `gemini.model` | `FIELDPROOF_GEMINI_MODEL` | required, no default |
| `gemini.temperature` | `FIELDPROOF_GEMINI_TEMPERATURE` | optional; unset means model default |
| `gemini.thinking-level` | `FIELDPROOF_GEMINI_THINKING` | optional |
| `gemini.media-resolution` | `FIELDPROOF_GEMINI_MEDIA_RES` | optional |
| `gemini.max-concurrency` | | default 4 |
| `gemini.max-retries` | | default 4, exponential backoff |
| `pricing.input-per-million`, `pricing.output-per-million` | | optional; if unset, report tokens only, never hard-code prices |
| `cache.dir` | | default `cache/` |

Also set `server.port=${PORT:8080}` for Cloud Run. Startup fails fast with a clear message if a required value is missing. The agent must check the SDK to see which optional Gemini parameters it supports and report any it does not.

### T3. Health endpoints

- `GET /api/health` returns `{status, model, vertexLocation, buildTime}` and never calls Gemini.
- `GET /api/gemini/ping` calls the model with 'Reply with the single word OK' and returns the text and latency. This proves the Cloud Run service account can reach Vertex. Mark it clearly for removal before submission.
- **Done when:** both endpoints work locally using your Application Default Credentials.

### T4. Dockerfile

Multi-stage build: a JDK 21 stage running `./mvnw -q -DskipTests package`, and a JRE 21 runtime stage that copies the jar and runs it, listening on `$PORT`. The container must start without any local files. **Done when:** `docker build` succeeds locally and `/api/health` answers from the running container.

### T5. Deploy script `scripts/deploy.sh`

It sources `~/fieldproof.env` and runs:

```
gcloud run deploy fieldproof --source . --region $CR_REGION \
  --service-account fieldproof-run@$PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated --memory 1Gi \
  --set-env-vars FIELDPROOF_GCP_PROJECT=$PROJECT_ID,FIELDPROOF_VERTEX_LOCATION=$VERTEX_LOCATION,FIELDPROOF_GEMINI_MODEL=$GEMINI_MODEL
```

It must stop with an error if any variable is empty. You run it (O11); the agent only writes it.

### T6. Core domain: DTOs and the severity mapper (pure Java)

In `core/`:

- `Signs` record: `leafRolling0to3`, `canopySenescence0to3`, `stunting0to3`, `soilCrackingVisible`.
- `GradingResult` record: `isCropField`, `sameFieldAcrossPhotos`, `screenRecaptureSuspected`, `crop`, `growthStage`, `signs`, `damageType`, `confidence`, `visibleEvidence` (list), `photoQualityFlags` (list).
- `SeverityBand` enum: `NONE, MILD, MODERATE, SEVERE`.
- `SeverityMapper.map(Signs)`, a single table-driven place in code:

| Band | Rule | Source |
|---|---|---|
| SEVERE | at least two of the three 0 to 3 signs score 2 or more | From the idea document |
| MODERATE | exactly one sign scores 2 or more | **Proposed, needs approval (D8)** |
| MILD | no sign scores 2 or more, but at least one scores 1 | **Proposed, needs approval (D8)** |
| NONE | all three signs score 0 | **Proposed, needs approval (D8)** |

Soil cracking does not change the band in this proposal; it is reported as a flag only. The agent implements the table as written and marks the proposed rows with a code comment until approved.

**Done when:** `SeverityMapperTest` passes: (3,2,1) gives SEVERE; (2,2,0) gives SEVERE; (2,1,1) gives MODERATE; (3,0,0) gives MODERATE; (1,1,1) gives MILD; (0,0,0) gives NONE; values below 0 or above 3 throw an exception.

### T7. Gemini gateway and response cache (`ai/`)

- `GeminiGateway.generate(GeminiCall)` where `GeminiCall` holds `promptVersion`, `systemInstruction`, a list of parts (text, or image bytes with MIME type and label), a response schema identifier and `pass`. It returns `GeminiResult(json, inputTokens, outputTokens, latencyMs, fromCache, modelVersion)`.
- Build the client in Vertex mode with project and location from config and Application Default Credentials. No API key.
- Request structured JSON output with a response schema; the agent checks the SDK for the supported way.
- Parse with Jackson into the target record. On failure retry once, then record a parse failure. Count parse failures.
- Retry HTTP 429 and 5xx with exponential backoff and jitter, capped by `max-retries`. Cap concurrency with a semaphore.
- `ResponseCache`: key is SHA-256 of model, prompt version, ordered image hashes, anchor order and pass. One JSON file per key under `cache.dir`. A hit never calls Gemini and is marked `fromCache`.
- **Done when:** tests prove a hit on identical input, a miss when pass or anchor order changes, and retry logic against a fake client. `/api/gemini/ping` works.

### T8. Prompts and the baseline (`src/main/resources/prompts/`)

- `grading_raw_v0.txt`: baseline for ablation arm (b). Asks only whether the field is damaged and for the damage type. Output: `damaged` (boolean), `damage_type`, `confidence`.
- `grading_signs_v1.txt`: the calibrated rubric (draft text in the appendix). Output schema is the `GradingResult` record.
- `PromptLibrary` loads prompts by version name and exposes the version string for the cache key and audit log.
- Damage types come from `config/label-map.yml`, not code, until D6 is answered. Create the file with placeholder values `none` and `other` only, and make the smoke run fail with a clear message if Person B has not filled it in.

### T9. Anchors and the grading service

- `AnchorLibrary` loads `data/anchors/anchors.json` and the three image files.
- `GradingService.grade(List<Image> photos, boolean useAnchors, int pass)` builds one multi-image call: for anchored calls, the three labelled references (healthy, moderate, severe) first, in an order shuffled by a seed derived from the pass number, then the claim photos. It accepts 1 to 3 photos so it works for single images and bundles (D7).
- Record the anchor order used on every result.
- Downscale images to about 768 px on the long edge unless the media-resolution setting makes this unnecessary (check the SDK).

### T10. Smoke test runner (`eval/`, Spring profile `smoke`)

A `CommandLineRunner` active only with `--spring.profiles.active=smoke`. For each row of `data/dev30/labels.csv` (skipping anchors) it runs four arms:

1. Raw prompt, one pass.
2. Signs rubric without anchors, one pass.
3. Signs rubric with anchors, pass 1.
4. Signs rubric with anchors, pass 2 (anchor order shuffled differently).

It writes `out/smoke_results.jsonl` (one line per image and arm, with the full model JSON) and `out/smoke_summary.md` containing:

- Damaged-vs-not accuracy, precision, recall and a confusion matrix per arm. For the signs arms, report twice: damaged meaning band MILD or above, and damaged meaning band MODERATE or above. Do not choose one.
- For the anchored arm: the share of images where both passes give the same band (coverage), and accuracy and precision on that agreeing subset only.
- JSON parse failure rate, average latency, token totals, and estimated cost per image if prices are configured.
- A list of every image where an arm disagrees with the label, with file name, label, band and visible evidence, for O12.

All model calls go through the cache, so a rerun is free.

### T11. Tests to keep green

`SeverityMapperTest`, `ResponseCacheTest`, `PromptLibraryTest`, a JSON parsing test using one valid and one malformed recorded response, and a `ConfigValidationTest` for missing required properties.

### T12. Contracts for Person B

Create `contracts/` with a JSON example for each of `GradingResult`, `EvidenceRecord`, `ClaimDecision` and `AuditRecord`. Only `GradingResult` has a fixed shape (T6). The agent drafts the other three from these proposed fields, and you and Person B review before anyone builds against them:

- `EvidenceRecord`: plot ID, season, season rainfall, trigger value, dry-spell days and whether it overlaps the critical growth stage, NDVI anomaly, evidence timestamps.
- `ClaimDecision`: claim ID, index outcome, photo band, satellite flag, outcome class, failure mode, recommended action, abstained (boolean).
- `AuditRecord`: claim ID, model ID, prompt version, anchor IDs and order, evidence timestamps, adjuster action and time.

Lowest priority tonight: do it only if T1 to T10 are done.

## 5. Tonight's schedule

| Block | Outside the IDE | In the IDE |
|---|---|---|
| First 1.5 hours | O1 to O5, O8 | T1, T2 while billing and API enablement settle |
| Next 1.5 hours | O6, O7 (D3 resolved), then O11 deploy | T3, T4, T5, T7 |
| Last hour | O9 and O10 with Person B (D6 settled), then O12 | T6, T8, T9, T10, then run the smoke test |
| If time remains | Record the Gate 1 result | T11, T12 |

If the Cloud Run deploy is not working by the end of the second block, stop everything else and fix it; Gate 1 requires a live URL. If the 30 images are late, run T10 on whatever Person B has sent, but do not report a number from fewer than about 20 images.

## 6. Gate 1 checklist

- [ ] Cloud Run URL loads `/api/health` on a laptop and on a phone.
- [ ] `/api/gemini/ping` returns OK from the deployed service, not just locally.
- [ ] Model ID, location and retirement date recorded in a note.
- [ ] Smoke test ran on the development images with a parse failure rate near zero.
- [ ] Accuracy for all arms, both band thresholds and the agreement coverage are written down.
- [ ] The 10 worst failures reviewed and classified (O12).
- [ ] If accuracy is below about 65% with anchors, the headline switched to precision at coverage.
- [ ] Cost per image noted, checked against the $15 and $30 budget alerts.

## 7. Known risks and gotchas

- **Model retirement.** See O7. Recheck the pinned model again on Sunday.
- **Preview models can change.** Pin the exact ID, keep the cache, and record the model version string returned with each result.
- **Gemini 3 controls.** Gemini 3 models use a thinking-level setting rather than a thinking budget, and a media-resolution setting for image inputs. Both affect cost and latency, so they are config values. Check the current guidance on temperature for Gemini 3 before lowering it.
- **Location mismatch.** The Vertex location (possibly `global`), the Cloud Run region (`asia-south1`) and the BigQuery dataset location can all differ. That is fine for Vertex calls, but pick the BigQuery location deliberately (D10).
- **Photos lose metadata.** Mobile and messaging apps often strip EXIF. Do not assume metadata exists; this matters Friday.
- **Agent hallucination.** The agent may invent SDK methods. `GEMINI.md` forces it to inspect the library and compile; reject any task whose output you have not seen compile and pass.
- **Public service.** `/api/gemini/ping` is public on a public Cloud Run service. Remove it or require auth before submission.
- **Data licence.** The dataset licence is unconfirmed, so do not commit images or put them in a public bucket.

## Appendix: draft of `grading_signs_v1.txt`

**System instruction.** You are an agronomy assistant helping an insurer review smartphone photos of crop fields. Describe only what is visible. Never estimate yield loss or give percentages. If reference images are provided, they come first and are labelled healthy, moderate and severe; use them only to calibrate your scores and never describe them as the claim photos. Score each sign from 0 to 3 where 0 is none, 1 is slight, 2 is clear and 3 is severe.

**Signs.**

- leaf rolling: leaves curled or folded lengthwise.
- canopy senescence: yellowing, browning or drying of leaves across the canopy.
- stunting: plants short, or a patchy stand, compared with the healthy reference.
- soil cracking visible: true or false.

**Other fields.** Set `is_crop_field` to false if the photo is not a crop field, and then score every sign 0. Set `same_field_across_photos` by comparing crop, growth stage and background across the claim photos (true when there is a single photo). Set `screen_recapture_suspected` to true if any photo appears to show a screen or a printed photo. Choose `damage_type` only from the allowed list loaded from `label-map.yml`. Add `photo_quality_flags` such as `photo_2_blurry` for any unusable photo. List up to three short phrases of `visible_evidence`. If you are unsure, lower `confidence` instead of guessing.

**Output.** JSON only, matching the response schema exactly.
