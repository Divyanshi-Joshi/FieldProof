# Person A, Day 3 (Sat Oct 17) implementation plan: product, integration and demo cases

Reference for Person A and for the AI coding agent (Antigravity / Gemini Code Assist). Save as `docs/DAY3_PERSON_A.md`. Section 5 is manual work outside the IDE. Section 6 is work handed to the agent, one task at a time. Anything undecided is an open item in section 3; nothing here fills those in silently. IDs: manual steps are `M3.x`, agent tasks are `T3.x`, open items continue the `D` numbering (this day starts at D21).

## 1. Goal for today and the Gate 3 rule

By the end of today the whole product works end to end on the live Cloud Run URL:

1. A farmer uploads photos on a phone and sees integrity feedback and a message in EN, HI or SW.
2. The claim runs through the real pipeline (Forensics, Concordance, Policy) and lands in the adjuster triage list.
3. The adjuster opens a claim, sees photos, graded signs, evidence and a cited brief, and approves, rejects or escalates. Every step writes an audit record.
4. Index Doctor and the validation tab (Person B's UI, your endpoints) load real data.
5. 6 to 8 demo cases are seeded, including a rejected duplicate and a flagged bad photo.
6. The public service is protected against runaway cost.

**Gate 3:** feature freeze at **10 PM IST**, and a stranger can run the demo in 3 minutes without help. After the freeze only bug fixes are allowed (Day 4).

**Frozen items stay frozen.** The grading rubric, anchors, `label-map.yml`, thresholds, model ID and `protocol/` do not change today; `FreezeGuard` still protects them. The policy and brief prompts are new and were not part of the evaluation, so you may edit them today, but version them (they are written to the audit log).

## 2. Inputs from Day 2 (fill in before you start)

| Item | Value |
|---|---|
| Gate 2 passed? | |
| Natural gap count and which outcome classes occurred in the test results | |
| Path of per-bundle results (`out/ablation/per_bundle_results.jsonl`) | |
| D12 outcome: arm (d) mode used in the ablation | |
| Known-good Cloud Run revision from Friday | |
| Protocol commit hash and time | |
| Cost per claim for grading so far | |
| Pinned model ID and retirement date | |
| BigQuery dataset ID and table names (`config/bq-schema.yml`) | |
| Did Person B deliver real `IntegrityTools` and `ConcordanceClassifier`? | |

## 3. Decisions and open items

### Decided

| Topic | Decision | Reason |
|---|---|---|
| Claim processing | Asynchronous: `POST` returns a claim ID at once, the UI polls a status endpoint | Mobile networks and a 30 to 60 second pipeline |
| Cloud Run CPU | Deploy with `--no-cpu-throttling` and `--cpu-boost` | By default Cloud Run throttles CPU once the response is sent, which would stall background processing |
| Shared state | Not in memory. Multiple instances can serve one claim, so state lives in Cloud Storage (D21) | Polling can hit a different instance |
| Audit log | BigQuery `audit_log`, append-only, one row per event | From the plan |
| Adjuster action | The decision endpoint returns an error if the audit write fails; a decision is never accepted without an audit record | Trust story |
| Brief citations | Code validates every cited clause ID against the policy index before the brief is shown | From the plan |
| Numbers in the brief | Code checks every number in the brief against the `EvidenceRecord`; one retry; otherwise a deterministic template brief is shown | The model must not misstate evidence |
| Payout language | No farmer-facing text promises or denies payment. Code appends a fixed disclaimer | Human decision is final |
| Original photos | Stored as uploaded (EXIF intact); the model sees a downscaled copy | Metadata checks need EXIF |
| Demo cases | Real dataset plots chosen from the frozen pipeline's own results, plus clearly labelled planted cases for the duplicate and bad photo | No manufactured gaps |
| Language toggle | EN, HI, SW; the third language is first on the cut list | From the plan |
| Public protection | Per-client rate limit, daily cap on live Gemini calls, a kill switch, Cloud Run instance limits, no public ping endpoint | Public service that spends money |

### Open items

| ID | Question | Recommendation | Needed by |
|---|---|---|---|
| D21 | Where does claim state live? | Cloud Storage JSON per claim (`claims/{id}.json`): simple, strongly consistent, already in the stack. BigQuery stays for audit and photo hashes | 09:30 |
| D22 | May dataset images be shown in a public demo and video under the dataset licence? | Check the licence text before showing; if unclear, show only the cases you are sure about and say so | 09:30 |
| D23 | Authentication for the adjuster tab | None for the demo, clearly labelled as a demo, with rate-limited writes. Confirm | 09:30 |
| D24 | Farmer messages: fixed templates per outcome class and language with reviewed translations, or model-written? | Templates; the model writes only the adjuster brief. Matches the "never promise payment" rule | 09:30 |
| D25 | If an outcome class never occurred naturally in the data (for example no spatial gap), what do we show? | Show only what occurred or what is clearly labelled constructed. Never present a constructed case as a finding | 12:00 |
| D26 | Minimum usable photos after integrity checks | 2 of 3 (matches the plan's example). Fewer than 2 gives an integrity hold and a request to re-upload | 09:30 |
| D27 | Async with polling (decided above) vs synchronous | Async. Confirm with Person B because it changes the UI | 09:30 |
| D28 | Frontend build: Node version, build command, output folder (proposed `frontend/dist`) | Person B confirms; A adds a Node stage to the Dockerfile | 09:30 |
| D29 | Retention of uploads from live users (judges and strangers) | Bucket lifecycle rule deleting `claims/` and `images/` for live uploads after 7 days, plus a one-line notice on the upload page. Demo cases are exempt | 12:00 |
| D30 | Who reviews the Hindi and Swahili text? | A native speaker. If none is available, label the text as machine-translated and unreviewed | 12:00 |

## 4. Hand-offs with Person B

| By | From | To | What |
|---|---|---|---|
| 09:30 | A | B | `contracts/api.md` final (Appendix A) and a `mock` profile serving fixtures with the real shapes |
| 09:30 | B | A | `policy/policy.txt` (illustrative 2-page policy with clause IDs), frontend build command and output folder (D28) |
| 09:30 | Both | | Close D21 to D28 |
| 11:30 | B | A | Real `IntegrityTools` and `ConcordanceClassifier` if not delivered Friday |
| 12:00 | B | A | `messages/en.yml`, `hi.yml`, `sw.yml` farmer message templates (D24, D30) |
| 13:00 | A | B | Integration deploy on Cloud Run for B to test the UI against real endpoints |
| 15:30 | Both | | Choose demo cases (M3.7) |
| 18:00 | A | B | Candidate deploy with seeded cases |
| 20:00 | Both | | Gate 3 stranger test |
| 22:00 | Both | | Feature freeze and known-bug list for Sunday |

## 5. Part 1: outside the IDE (you do these by hand)

### M3.1 Start-of-day check (08:30)

```
source ~/fieldproof.env
git pull
./mvnw -q verify
gcloud run revisions list --service fieldproof --region $CR_REGION
```

Fill in section 2. Open `docs/EVAL_LOG.md` and confirm the ablation ran once and Gate 2 is recorded. Close D21 to D28 with Person B (30 minutes, in a call).

### M3.2 Copilot go or no-go (decide at 15:00)

The adjuster copilot chat (T3.13) is built only if: Gate 2 passed, steps T3.1 to T3.12 are done, the integration deploy works, and it is before 15:30. Otherwise cut it without discussion.

### M3.3 Check the policy file

Open `policy/policy.txt`. It must be marked illustrative, have stable clause IDs (for example `C-3.2`), and must not present any real scheme rule as a fact. Do not quote PMFBY text in it. Count the clause IDs; `PolicyIndex` will load them.

### M3.4 Translations review (D30)

Ask a native speaker to read `messages/hi.yml`, `messages/sw.yml` and one generated brief per language. If nobody is available by 17:00, the UI must show a "machine-translated, not reviewed" label next to Hindi and Swahili text. Do not remove that label silently.

### M3.5 Create the BigQuery tables

Use the dataset ID from `config/bq-schema.yml`.

```
bq mk --table $PROJECT_ID:$DATASET.audit_log ts:TIMESTAMP,claim_id:STRING,event:STRING,actor:STRING,model_id:STRING,model_version:STRING,rubric_hash:STRING,prompt_versions:STRING,anchor_ids:STRING,evidence_ts:STRING,outcome_class:STRING,payload:STRING
```

If Person B has not created `photo_hashes` (claim_id, photo_index, sha256, phash, ts), agree who creates it. Check the table exists with `bq show`.

### M3.6 Bucket layout and lifecycle (D29)

```
gcloud storage ls gs://$PROJECT_ID-fieldproof-images
```

Planned prefixes: `claims/`, `images/`, `cache/`, `demo/`. Create a lifecycle rule that deletes objects under `claims/` and `images/` older than 7 days **for live uploads only**; demo claims live under `demo/` so they are exempt. Write the rule as JSON and apply it:

```
gcloud storage buckets update gs://$PROJECT_ID-fieldproof-images --lifecycle-file=lifecycle.json
```

Confirm the rule matches only the live prefixes before applying it.

### M3.7 Choose the demo cases with Person B (15:30)

Read `out/ablation/per_bundle_results.jsonl`. Pick cases from the frozen pipeline's own outputs, not by hunting for the outcome you want:

| Case | Source | Label in the UI |
|---|---|---|
| Phenological basis-risk gap | Natural test case, if one occurred | Real plot |
| Spatial basis-risk gap | Natural test case, if one occurred | Real plot (D25 if none) |
| Evidence conflict | Natural test case | Real plot |
| Non-weather loss | Natural test case | Real plot |
| Confirmed payout | Natural test case | Real plot |
| Rejected duplicate | Planted bundle | **Planted test case** |
| Flagged bad photo | Planted bundle | **Planted test case** |

Include at least one case where the system abstains or the grade disagrees with the dataset label, and say so on screen (the plan: "failure cases shown unprompted"). Record each choice and the reason in `demo/demo_cases.yml`. If an outcome class did not occur naturally, follow D25; do not invent a case and call it real.

### M3.8 Deploys

Three planned deploys with `./scripts/deploy.sh`: integration (13:00), candidate (18:00), final (21:30). After each, write the new revision name next to the previous one in `docs/DEPLOY_LOG.md`.

```
gcloud run revisions list --service fieldproof --region $CR_REGION
```

### M3.9 Rehearsal and Gate 3 test (19:30 to 21:30)

- Run `./scripts/e2e_smoke.sh https://<service-url> <photo-folder>` against the live URL.
- Run the full demo on a phone over mobile data and on a laptop in a private window.
- Have someone outside the project run the demo with no help; time it. It must take under 3 minutes.
- Test each language toggle on a brief and on a farmer message.
- Test the failure path: upload a duplicate, a blurry photo and a non-field photo.
- Test the kill switch: set `FIELDPROOF_LIVE_UPLOADS_ENABLED=false`, confirm uploads show the "demo only" message and the seeded cases still open. Turn it back on.
- Write every problem on the bug list, tagged blocker, visible or cosmetic.

### M3.10 Feature freeze (22:00)

```
git tag feature-freeze
git grep -nIE 'AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|"private_key"'
git ls-files | grep -Ei '\.(jpg|jpeg|png|heic)$'
```

Both commands should print nothing sensitive. Note the final revision as the known-good revision, fill in the Day 4 inputs table, and check the billing report for today's spend.

## 6. Part 2: in the IDE (the agent builds these)

### How to drive the agent

Paste this at the start of each task, changing only the task ID:

> Read `GEMINI.md`, `docs/DAY2_PERSON_A.md` and `docs/DAY3_PERSON_A.md`. Implement task T3.<n> only. Do not touch files outside that task, and never change frozen items (rubric, anchors, label map, thresholds, model, protocol). If anything is unclear or an open item (D21 to D30) blocks you, stop and ask me instead of assuming. Run `./mvnw -q verify` and show me the output before you say you are done.

### T3.1 API contract and mock mode

- Create `contracts/api.md` and example JSON files from Appendix A.
- Define the API records in `api/` and a Spring profile `mock` that serves fixtures from `contracts/examples/` through the same controllers' routes, so Person B can build the UI against the real shapes.
- **Done when:** with `--spring.profiles.active=mock`, every endpoint in Appendix A returns its fixture, and a test checks each fixture parses into its record.

### T3.2 Storage layer

- `ClaimStore` interface: `create`, `get`, `update`, `list(filter)`, `appendAuditView`.
- `GcsClaimStore`: one JSON object per claim at `claims/{claimId}.json`, originals at `images/{sha256}`, demo claims at `demo/claims/{claimId}.json`. Writes are whole-object replacements guarded by object generation (so two instances cannot overwrite each other silently; check the Storage client for generation-match preconditions).
- `LocalClaimStore` (profile `local`) for development.
- Config: bucket name from an environment variable.
- **Done when:** tests run against `LocalClaimStore`, and a test shows a conflicting update is rejected.

### T3.3 Upload endpoint and validation

`POST /api/claims` (multipart). Validate before any model call:

- Exactly 3 files named `photos`. Types JPEG and PNG only, identified by magic bytes and by decoding with `ImageIO`, not by file name. Each file at most 10 MB. Minimum dimensions from config.
- `plotId`, `season`, `claimDate` and `language` (`en`, `hi`, `sw`) are required and validated.
- Compute SHA-256 of each original, store originals unchanged, create the claim in status `PROCESSING`, return `202` with the claim ID, and start processing on a bounded executor (config, default 4). Processing runs the pipeline in AGENT mode.
- Respect the kill switch and limits from T3.9.
- Field errors use the error codes in Appendix A.

### T3.4 Real pipeline wiring

- Replace the stub integrity tools and classifier with Person B's implementations if they are delivered; otherwise keep the stubs and say so.
- Apply D26: continue with 2 or more usable photos; otherwise `INTEGRITY_HOLD` with the reasons.
- Record per-photo outcomes (accepted or rejected, reason code) on the claim so the farmer sees the Wanjiru moment: a rejected duplicate with a plain explanation.
- After a claim is accepted, write the photo hashes to `photo_hashes` so later claims can be checked against it.
- Status steps exposed to the UI: `RECEIVED`, `CHECKING_PHOTOS`, `GRADING`, `GATHERING_EVIDENCE`, `WRITING_BRIEF`, `AWAITING_ADJUSTER` (or `HOLD`, `REJECTED_PHOTOS`, `ERROR`), later `ADJUSTER_DECIDED`.
- **Done when:** an integration test with fake tools covers: all photos fine; one duplicate rejected and two continue; two or more rejected gives a hold; an agent error gives status `ERROR` with a safe message and no partial result shown as final.

### T3.5 Policy agent and brief

- `PolicyIndex` loads `policy/policy.txt` and exposes clause IDs and text. Fail at startup if no clause IDs load.
- Tools: `lookup_clause(topic_or_id)`, `draft_brief`, `validate_citations`, terminal `submit_brief`.
- Brief structure: one-line summary; the severity band in words with the signs that justify it; the index outcome with the rainfall and trigger figures; the satellite and dry-spell evidence; the outcome class and failure mode; the recommended action; a list of cited clause IDs. Generated in the requested language (`en`, `hi`, `sw`); clause IDs and numbers are never translated.
- Guards in code, in this order: (1) every cited clause ID exists in `PolicyIndex`; (2) every number in the brief appears in the `EvidenceRecord` or the policy text; (3) the brief must not contain a payment decision (the adjuster decides). On a failure, retry once with the failure reason; on a second failure, generate a deterministic template brief from the structured facts and mark it `fallback=true`.
- Cache by (claim ID, language, prompt version). The prompt file lives in `prompts/policy_brief_v1.txt`; its version goes to the audit log.
- Draft system prompt is in Appendix B.
- **Done when:** tests cover an unknown clause ID rejected, a wrong number rejected, a payment-decision phrase rejected, and the fallback path.

### T3.6 Farmer messages (D24)

- `messages/{en,hi,sw}.yml` with one message per outcome class and per photo-rejection reason code, written by Person B and reviewed (D30). Code appends a fixed disclaimer per language: the message is a status update, a human adjuster makes the final decision, and no payment is promised.
- `MessageService.messageFor(outcomeClass, rejections, lang)`.
- A startup validation test fails if any outcome class, reason code or language is missing.
- If D24 is answered "model-written", stop and ask me before building a different design.

### T3.7 Audit log

- `AuditRecord` per Appendix A and `AuditWriter` using the BigQuery insert API (append only).
- Events: `CLAIM_RECEIVED`, `INTEGRITY_CHECKED`, `GRADED`, `EVIDENCE_GATHERED`, `OUTCOME_RECOMMENDED`, `BRIEF_GENERATED`, `ADJUSTER_ACTION`.
- Fields: model ID, model version string, rubric hash, prompt versions, anchor IDs and order, evidence timestamps, outcome class, and for adjuster actions the actor, action and note.
- Pipeline events: retry on failure, then log and mark the claim `auditDegraded=true`. Adjuster actions: no audit record means no accepted decision (HTTP 503).
- **Done when:** tests with a fake BigQuery client prove retry, degraded marking, and the 503 on an adjuster action.

### T3.8 Claims, triage and adjuster endpoints

- `GET /api/claims/{id}/status` (farmer polling, includes per-photo feedback and the farmer message once ready).
- `GET /api/claims` with optional `outcome` and `status` filters, sorted by priority: phenological and spatial gaps first, then evidence conflict, then integrity hold, then possible overpayment, then the rest, newest first within each.
- `GET /api/claims/{id}` full detail for the adjuster view (photos with `/api/images/` URLs, graded signs and per-pass results, agreement, evidence, outcome, brief, audit trail, model and prompt versions).
- `GET /api/claims/{id}/brief?lang=` generates and caches the brief in another language on demand.
- `POST /api/claims/{id}/decision` with `{action: APPROVE|REJECT|ESCALATE, note, adjuster}`; requires a successful audit write (T3.7).
- **Done when:** tests cover priority ordering, a valid decision, an invalid action, and the audit-failure 503.

### T3.9 Public service protection

- Remove `/api/gemini/ping`, or require a header token taken from an environment variable.
- In-memory per-client rate limit on `POST /api/claims` and on `GET /api/claims/{id}/brief` when it triggers a model call (config values). Because Cloud Run may run up to 3 instances, treat the limit as approximate and say so in a code comment.
- A daily cap on live Gemini calls from config, with a clear message when reached.
- Kill switch `FIELDPROOF_LIVE_UPLOADS_ENABLED`; when false, uploads return `503` with `{demoOnly: true}` and seeded cases keep working.
- Never log request bodies, image bytes or farmer free text.
- **Done when:** tests cover the limit, the daily cap, the kill switch, and that cached or demo claims are exempt.

### T3.10 Image serving

`GET /api/images/{sha256}` streams the stored original (or a downscaled copy) from the private bucket through the service. Serve only hashes that belong to a stored claim. Headers: correct content type, `Cache-Control: private, max-age=3600`. No directory listing and no path parameters other than the hash.

### T3.11 Response cache in Cloud Storage

`ResponseCache` gets a `cache.backend` setting `file` or `gcs`, with write-through to `gs://.../cache/`. This is what makes demo cases survive a rate limit on Cloud Run, whose local disk is temporary. Cache keys are unchanged, so Friday's cache can be uploaded and reused.

### T3.12 Demo seeder (`eval/`, profile `seed`)

- Reads `demo/demo_cases.yml` (bundle ID, display name, persona note, `planted: true|false`, reason chosen).
- Runs the real pipeline in AGENT mode for each case, with caching, stores the claim under `demo/claims/`, pre-generates the brief in EN, HI and SW, and marks `demo=true` and `planted` on the claim.
- Persona text for the farmer story is labelled Kenya, with plot IDs and numbers taken from the real result, never invented.
- Fails with a clear message if a listed bundle is missing or its images are not in the bucket.
- **Done when:** running it twice produces identical stored claims (the second run makes no Gemini calls).

### T3.13 Adjuster copilot chat (optional, only if M3.2 says go)

`POST /api/claims/{id}/chat` with a single Gemini call grounded only in that claim's JSON, the policy clauses and the audit trail. It answers questions such as why the severity is only moderate. It must refuse to give or change a payment decision, must cite clause IDs from the policy index only, must not call tools, and is rate limited. Keep it to two hours; stop if it runs over.

### T3.14 Dockerfile and deploy script update

- Dockerfile gains a Node build stage that builds `frontend/` (command and output folder from D28), copies the result into `src/main/resources/static` for the Spring Boot stage, and keeps the existing JRE runtime stage.
- A `SpaForwardController` forwards `/farmer`, `/insurer` and `/validation` (and their sub-paths) to `index.html`, without capturing `/api/**`.
- `scripts/deploy.sh` adds `--no-cpu-throttling --cpu-boost --max-instances 3 --concurrency 20 --timeout 120`, and passes the new environment variables (bucket, dataset, daily cap, rate limit, live-uploads switch).
- **Done when:** `docker build` works locally, the React pages load from the container, and `/api/health` still answers.

### T3.15 End-to-end smoke script

`scripts/e2e_smoke.sh <base-url> <photo-folder>` calls the upload endpoint with three photos, polls the status until `AWAITING_ADJUSTER` or a failure (timeout from config), fetches the claim detail, posts a decision, and checks the audit trail contains the `ADJUSTER_ACTION`. It prints a pass or fail line per step and exits non-zero on any failure.

### T3.16 Final check

`./mvnw -q verify` green, no secrets, no image files staged, `contracts/` matches the real responses.

## 7. Schedule (IST)

| Time | Outside the IDE | In the IDE |
|---|---|---|
| 08:30 to 09:30 | M3.1, close D21 to D28, M3.3 | T3.1 (publish the contract and mock mode by 09:30) |
| 09:30 to 11:30 | M3.5, M3.6 | T3.2, T3.3, T3.11 |
| 11:30 to 13:30 | M3.4 (find a reviewer) | T3.4, T3.7 |
| 13:00 | M3.8 integration deploy | T3.14 (Dockerfile and deploy script, needed for this deploy) |
| 13:30 to 15:30 | | T3.5, T3.6, T3.8 |
| 15:00 | M3.2 copilot go or no-go | |
| 15:30 to 17:00 | M3.7 choose demo cases with B | T3.9, T3.10 |
| 17:00 to 18:30 | M3.8 candidate deploy at 18:00 | T3.12 seeding, T3.13 only if go |
| 18:30 to 19:30 | | T3.15, fix integration bugs |
| 19:30 to 21:30 | M3.9 rehearsal and stranger test | fixes only |
| 21:30 to 22:00 | M3.8 final deploy, M3.10 freeze | T3.16 |

Because T3.14 is needed by the 13:00 deploy, do it right after T3.3 if the schedule slips. If you are behind at 15:00, cut in this order: adjuster copilot chat, live Open-Meteo demo, the third language, map polish. Never cut: the integrity checks, the three-signal concordance, Index Doctor, the validation tab, the Cloud Run deployment and the audit log.

## 8. Gate 3 checklist

- [ ] Upload to adjuster decision works on the live URL, on a phone and a laptop.
- [ ] A rejected duplicate shows a plain explanation to the farmer.
- [ ] A flagged blurry or non-field photo is shown and explained.
- [ ] Every demo case opens; each is labelled real or planted; one failure or abstention case is included.
- [ ] Briefs show validated clause citations and switch between EN, HI and SW; unreviewed translations are labelled.
- [ ] `audit_log` contains rows for a full claim, including the adjuster action.
- [ ] Index Doctor slider and validation tab show real data and the protocol commit hash.
- [ ] Kill switch, rate limit and daily cap tested; no public ping endpoint.
- [ ] A stranger completes the 3-minute demo without help.
- [ ] `feature-freeze` tag, known-good revision, bug list and Day 4 inputs recorded; secrets scan clean.

## 9. Risks

- **Background work stalls on Cloud Run** if CPU throttling is left on. The deploy flags above prevent it; check them after every deploy.
- **State on the wrong instance.** Anything kept in memory will vanish between polls. Keep claim state in the bucket.
- **Person B's tools arrive late.** Integrate with stubs, label the demo honestly, and swap in the real tools as soon as they land.
- **Natural data lacks a case you want.** Follow D25; do not manufacture findings.
- **Translation quality.** Hindi and Swahili text without a reviewer must carry the unreviewed label.
- **Cost surprise from public traffic.** Daily cap, rate limits and `--max-instances 3` bound it; check billing at lunch and at 18:00.
- **Dataset licence (D22).** Do not show or upload images you are unsure you may display.
- **Scope creep after 18:00.** Anything new goes to the Sunday bug list, not into the build.

## Appendix A: API contract

All JSON, same origin, no authentication on the demo (D23). Errors use `{error: {code, message, fields}}`.

| Method and path | Purpose | Response |
|---|---|---|
| `POST /api/claims` | Multipart: `plotId`, `season`, `claimDate`, `language`, `photos` x3 | `202 {claimId, status}`; `400` validation; `429` rate limit; `503 {demoOnly: true}` when live uploads are off |
| `GET /api/claims/{id}/status` | Farmer polling | `{claimId, status, step, photos[{index, sha256, accepted, reasonCode, message}], farmerMessage{lang, text}}` |
| `GET /api/claims` | Triage list; filters `outcome`, `status`, `limit` | `[{claimId, plotId, season, county, createdAt, outcomeClass, failureMode, photoBand, abstained, status, demo, planted, priority}]` |
| `GET /api/claims/{id}` | Adjuster detail | `{claim, photos[{url, accepted, flags}], grading{signs, band, passes[], agreed, confidence, flags}, evidence{...}, outcome{outcomeClass, failureMode, action}, brief{lang, sections, citations[], fallback}, audit[{ts, event, actor, payload}], versions{modelId, modelVersion, rubricHash, promptVersions}}` |
| `GET /api/claims/{id}/brief?lang=` | Brief in another language | `{lang, sections, citations[], fallback}` |
| `POST /api/claims/{id}/decision` | `{action: APPROVE or REJECT or ESCALATE, note, adjuster}` | `200 {status, auditId}`; `503` if the audit write failed |
| `GET /api/images/{sha256}` | Stored photo | image bytes |
| `GET /api/config/public` | UI settings | `{liveUploadsEnabled, languages, protocolCommit, protocolTime, modelId}` |
| `GET /api/validation/metrics` | Built on Day 2 | metrics, risk-coverage data, freeze summary |
| Index Doctor endpoints | Person B's query | defined by Person B in `contracts/api.md` |

**Photo reason codes:** `DUPLICATE_WITHIN_CLAIM`, `DUPLICATE_OF_EARLIER_CLAIM`, `BLURRY_OR_UNUSABLE`, `NOT_A_CROP_FIELD`, `DIFFERENT_FIELD`, `SCREEN_RECAPTURE`, `UNSUPPORTED_FORMAT`, `TOO_LARGE`, `METADATA_MISMATCH`.

**Audit record fields:** `ts`, `claim_id`, `event`, `actor` (system or adjuster name), `model_id`, `model_version`, `rubric_hash`, `prompt_versions`, `anchor_ids` (with order), `evidence_ts`, `outcome_class`, `payload` (JSON string: photo verdicts, adjuster action and note).

**Upload rule for the frontend (Person B):** send the original photos. Do not resize or re-encode in the browser, because that strips the metadata the server checks. Use `accept="image/jpeg,image/png"` with `capture="environment"`; on iOS this normally makes the browser deliver JPEG instead of HEIC.

## Appendix B: policy agent prompt (draft)

You write a brief for a human insurance claims adjuster. You do not decide payments, you do not recommend an amount, and you do not change the outcome. You receive structured facts for one claim: the severity band and the signs behind it, the index result with rainfall and trigger figures, the satellite evidence, the dry-spell window, the outcome class, and the failure mode. Use `lookup_clause` to find the policy clauses that apply and cite them by clause ID only. Write in the requested language. Keep clause IDs and every number exactly as given; do not round, convert or add numbers. State uncertainty where the facts show it (for example when the two grading passes agreed only partly). End by calling `submit_brief`. The system will reject a brief that cites an unknown clause, contains a number not in the facts, or states a payment decision.
