# Person A, Day 2 (Fri Oct 16) implementation plan: core intelligence and honest evaluation

Reference for Person A and for the AI coding agent (Antigravity / Gemini Code Assist). Save as `docs/DAY2_PERSON_A.md`. Section 5 is manual work outside the IDE. Section 6 is work handed to the agent, one task at a time. Anything undecided is an open item in section 3; nothing here fills those in silently. IDs: manual steps are `M2.x`, agent tasks are `T2.x`, open items continue the `D` numbering from Day 1.

## 1. Goal for today and the Gate 2 rule

By the end of today:

1. The rubric is frozen (at most 2 revisions in total, counting Day 1), and a freeze manifest proves nothing changed afterwards.
2. Three tool-calling agents exist (Forensics, Concordance, and their tools), and a claim pipeline runs end to end in two modes: direct code path and agent path.
3. The frozen trigger protocol is committed in git (Person B commits it) **before** any test image is scored.
4. The four-arm ablation has run once on the held-out test set, with every response cached.
5. You can read a metrics table aloud honestly, name the protocol commit hash, and state the natural gap count.

**Gate 2 rule:** if you are behind by 15:00, cut in this order: adjuster copilot chat, live Open-Meteo demo (`fetch_open_meteo` stays unbuilt), switching to ADK. Never cut BigQuery, the integrity checks, the frozen protocol, the three-signal concordance, or the ablation.

Out of scope today: policy agent and brief (Saturday), audit log, frontend, translations, Index Doctor UI (Person B owns the Index Doctor query).

### Honest-evaluation rules (hard)

1. No test image goes through Gemini until `eval/freeze.json` exists and the guard passes.
2. After the freeze, prompts, anchors, model ID, thresholds and the protocol file do not change. The guard enforces this.
3. Nobody opens test images to tune anything. Prompt revisions use the development set only.
4. The test set is run once. Resuming an interrupted run from the cache is allowed (same inputs, same keys). A rerun after a bug in non-model code is allowed only if it is logged in `docs/EVAL_LOG.md` with the reason and the commit hash.
5. Report what the frozen rule produces, including a small or awkward gap count. No threshold changes after results are seen.

## 2. Inputs from Day 1 (fill in before you start)

| Item | Value |
|---|---|
| Pinned model ID | |
| Vertex location | |
| Model retirement date | |
| Smoke accuracy, anchored, damaged = MILD or above | |
| Smoke accuracy, anchored, damaged = MODERATE or above | |
| Agreement coverage (both passes same band) | |
| Parse failure rate | |
| Cost per image (tokens and dollars) | |
| Rubric revisions used so far (max 2) | |
| Gate 1 headline decision (normal, or lead with precision at coverage) | |

## 3. Decisions and open items

### Decided

| Topic | Decision | Reason |
|---|---|---|
| Agent runtime | Plain Java function-calling loop on the GenAI SDK; ADK only if it is working by Friday noon | Fewer moving parts |
| How an agent finishes | Each agent ends by calling a **terminal tool** (`submit_forensics`, `submit_concordance`) whose arguments are validated by code | Avoids mixing response schemas with function calling |
| Who classifies the claim | Code. The model must call `apply_decision_table`; the outcome class is whatever that tool returns | The model never decides money |
| Numbers in results | Copied by code from tool results. The terminal tools take no numeric arguments for evidence | The model cannot mistype or invent a number |
| SQL exposure | `query_bigquery` accepts a **named query from an allowlist** plus parameters; never raw SQL | Auditable and injection-proof |
| Integrity override | If the hash, metadata or recapture checks fail, code sets the outcome to `INTEGRITY_HOLD` even if the model says otherwise | Trust by default |
| Freeze proof | `eval/freeze.json` records hashes of rubric, anchors, protocol file, manifests, plus model settings and git commit; a guard blocks any eval run if they differ | Closes the circularity risk |
| Eval log | Append-only `docs/EVAL_LOG.md` | Honest record of every run |
| Cache | The Day 1 file cache is reused by all arms where the call is identical | Cost |
| Photo threshold | Severity band at least MODERATE, with both passes agreeing (from the plan) | Frozen protocol |
| Concordance outcome set | The 8 outcomes in the decision table (see Appendix C) | From the plan |

### Open items

| ID | Question | Needed by | Blocks |
|---|---|---|---|
| D6 | Dataset label schema, which labels mean damaged, weather vs non-weather damage types | 09:30 (carry-over) | everything scored |
| D7 | Bundles of 3 photos vs single images | 09:30 (carry-over) | ablation input shape |
| D8 | Approve the MODERATE, MILD, NONE severity rules (only SEVERE is from our documents) | 09:30 (carry-over) | rubric freeze |
| D11 | BigQuery dataset ID, table names and column names. Person B provides `config/bq-schema.yml` | 10:00 | T2.5, T2.6 |
| D12 | Ablation arm (d): run through the tool-calling agents (extra Gemini calls, less repeatable) or through the direct code path with the same tools? **Recommendation: direct path for the ablation, agent path for live and demo claims, disclosed on the validation page** | 11:00 | T2.7, T2.8 |
| D13 | Test set size (300 or 200) and bundle count, decided after the dry-run cost estimate | 13:30 | T2.8 |
| D14 | Frozen protocol contents: percentile (default 30), season window and growth-stage calendar per crop, NDVI cutoff, photo threshold, definition of plot-level rain low. Confirm Person B writes and commits it at `protocol/frozen_protocol.yml` | 12:30 | the freeze |
| D15 | Perceptual-hash Hamming-distance threshold and metadata tolerances for date and location (Person B) | 12:00 | Forensics tools |

## 4. Hand-offs with Person B

| By | From | To | What |
|---|---|---|---|
| 09:30 | A | B | Java interfaces and records from T2.3, so B implements against them (stubs included so nobody is blocked) |
| 09:30 | B | A | `labels.csv` for dev and test, `eval/dev_manifest.csv`, `eval/test_manifest.csv`, images in `data/dev100/` and `data/test300/` (D6, D7) |
| 10:00 | B | A | `config/bq-schema.yml` (D11) |
| 12:30 | B | A | `protocol/frozen_protocol.yml` and `protocol/trigger.sql` committed; A records the commit hash (M2.5) |
| 14:00 | B | A | Real `IntegrityTools` and `ConcordanceClassifier` (A runs on stubs until then) |
| 14:00 | B | A | `eval/planted_manifest.csv` of 10 to 20 planted bad bundles |
| 21:00 | A | B | `validation/` folder with metrics, risk-coverage data and the freeze summary (T2.11) |

## 5. Part 1: outside the IDE (you do these by hand)

### M2.1 Start-of-day check (09:00)

Fill the table in section 2. Pull `main`, run `./mvnw -q verify`, and open the Cloud Run URL `/api/health`. Source `~/fieldproof.env`.

### M2.2 Close D6, D7, D8 with Person B (by 09:30)

Settle the label schema, bundle shape and severity rules. For D8, edit the proposed-row comments in `SeverityMapper` to say approved, run the tests, and commit `core: approve severity bands`.

### M2.3 Rubric decision and freeze (decide by 11:00, freeze by 12:00)

Review the Day 1 failures (O12 results). Decide whether the rubric needs a revision. You may revise at most twice in total across Day 1 and Day 2, and only using the development set. When you freeze, commit and run:

```
git tag rubric-frozen
```

From this point `grading_signs_v1*.txt`, `grading_raw_v0.txt` and `anchors.json` are read-only.

### M2.4 Confirm the split and seal the test set (by 10:30)

Check that `data/dev100/` and `data/test300/` contain no anchor images and no `dev30` images, that damage classes are stratified in the test set, and that there is no overlap between dev and test. Commit the manifests (IDs and file hashes only, never images). Record the hash:

```
shasum -a 256 eval/test_manifest.csv eval/dev_manifest.csv
```

Rule: nobody looks at test images to tune anything.

### M2.5 Verify the frozen protocol commit (before 13:00, hard gate)

```
git log --follow --format='%H %cI %an' -- protocol/frozen_protocol.yml protocol/trigger.sql
```

Write the commit hash and timestamp into `docs/EVAL_LOG.md`. It must predate the first test-set call. If the file is edited afterwards, the freeze guard will fail and you will see it.

### M2.6 BigQuery access check (after D11)

Using the names from `config/bq-schema.yml`:

```
bq query --nouse_legacy_sql 'SELECT COUNT(*) FROM `PROJECT.DATASET.TABLE`'
```

Confirm the Cloud Run service account `fieldproof-run` can read the dataset (roles were granted on Day 1, O5). If B created the dataset, make sure it is in the same project.

### M2.7 Cost gate (after T2.8 dry-run)

Read the dry-run estimate. Compare it with your budget alerts ($15 and $30) and the Day 1 cost per image. Decide the test size (D13) and write the decision and the estimate in `docs/EVAL_LOG.md`.

### M2.8 Create the freeze manifest (before the ablation)

```
./mvnw spring-boot:run -Dspring-boot.run.profiles=freeze
git add eval/freeze.json docs/EVAL_LOG.md
git commit -m 'eval: freeze manifest'
git tag eval-frozen
```

Check that the working tree is clean for the frozen files first; the freeze command refuses otherwise.

### M2.9 Run the ablation

```
./mvnw spring-boot:run -Dspring-boot.run.profiles=ablation -Dspring-boot.run.arguments='--dry-run'
./mvnw spring-boot:run -Dspring-boot.run.profiles=ablation
```

Run the dry-run first and read the output (M2.7). Then run for real. Watch the log for 429 rate-limit errors; if they pile up, lower `FIELDPROOF_GEMINI_MAX_CONCURRENCY` and resume (the cache makes resuming safe).

### M2.10 Read the results honestly (by 20:00)

Open `out/ablation/metrics.md`. Write one sentence per arm you could say out loud without embarrassment. Look at the 15 worst failures and tag the cause. Record the natural gap count. Copy `out/ablation/metrics.json`, `risk_coverage.csv`, `gaps.csv`, `integrity.json` into `validation/`, confirm no image files are included, commit and push. Update the Gate 1 headline decision if the numbers demand it.

### M2.11 Intermediate deploy (by 19:00)

Run `./scripts/deploy.sh` and verify `/api/health`, `/api/gemini/ping` and `/api/validation/metrics` on the live URL. New dependencies (BigQuery, hashing) are the usual cause of a broken container. Note the working revision name:

```
gcloud run revisions list --service fieldproof --region $CR_REGION
```

### M2.12 Record numbers for the deck

Write down measured cost per claim, latency (p50 and p95), the share escalated or abstained (the `e` in the unit-economics formula), the gap count, and the protocol commit hash in `docs/NUMBERS_FOR_DECK.md`. Person B and Day 4 use these.

## 6. Part 2: in the IDE (the agent builds these)

### How to drive the agent

Paste this at the start of each task, changing only the task ID:

> Read `GEMINI.md`, `docs/DAY1_PERSON_A.md` and `docs/DAY2_PERSON_A.md`. Implement task T2.<n> only. Do not touch files outside that task. If anything is unclear or an open item (D6 to D15) blocks you, stop and ask me instead of assuming. Run `./mvnw -q verify` and show me the output before you say you are done.

### T2.0 Dependencies and rules update

- Replace `GEMINI.md` with the Day 2 version supplied with this plan.
- Add to `pom.xml` (look up current releases, do not guess versions): the Google Cloud `libraries-bom`, `com.google.cloud:google-cloud-bigquery`, `com.google.cloud:google-cloud-storage`, a perceptual-hash library (JImageHash, `dev.brachtendorf:JImageHash`), and `com.drewnoakes:metadata-extractor`.
- **Done when:** `./mvnw -q verify` passes and the app still starts.

### T2.1 Freeze manifest and guard (`eval/`)

- `FreezeManifest` record with: rubric file name and SHA-256, raw prompt SHA-256, anchors (id and file SHA-256), model ID, Vertex location, temperature, thinking level, media resolution, SHA-256 of `protocol/frozen_protocol.yml` and `protocol/trigger.sql`, last commit hash of the protocol files, SHA-256 of the dev and test manifests, git HEAD, timestamp.
- Spring profile `freeze` writes `eval/freeze.json`. It must refuse to run if `git status --porcelain` shows uncommitted changes in any frozen file.
- `FreezeGuard.verify()` recomputes everything and compares it with `eval/freeze.json`. It throws with a readable diff. Every eval runner calls it before its first model call. Git access goes behind a small `GitInfo` interface so tests use a fake.
- **Done when:** tests cover a matching manifest, a changed prompt, a changed anchor, a changed protocol file, and a dirty tree.

### T2.2 Tool framework (`agents/`)

- `Tool` interface: name, description, JSON schema for parameters, `execute(JsonNode)` returning a `ToolResult` (JSON or error).
- `ToolRegistry` that rejects unknown tool names and validates arguments against each tool's schema before executing.
- `AgentRunner` loop: send the conversation to Gemini with the function declarations, execute any function calls, send the function responses back, and stop when the agent calls its terminal tool. Limits: maximum 8 steps and a time cap, both config values. A tool exception is returned to the model once as an error result, not thrown.
- Extend the gateway for function calling. The agent must check the SDK for the correct way to declare functions and read function calls. **Gemini 3 models can return reasoning metadata (thought signatures) with function calls; append the model's returned content to the history exactly as received, without rebuilding it, and check the SDK documentation for the rules.** The agent must report if it cannot confirm this.
- `AgentTrace` records step, tool, arguments, result, tokens and latency for the later audit log.
- **Done when:** tests with a fake gateway show: model calls tool A then the terminal tool gives a final result; an unknown tool name is rejected; invalid arguments are rejected; the step cap stops a loop.

### T2.3 Interfaces and records for Person B (publish by 09:30)

In `core/` (pure Java): `ClaimContext(claimId, plotId, season, claimDate, latitude, longitude)`, `PhotoRef`, `ClaimPhotos`, `HashReport`, `MetadataReport`, `ConcordanceInputs`, `ClaimOutcome`, and the enum `OutcomeClass` with the 8 values in Appendix C.

`ConcordanceInputs` fields: `indexPays`, `photoBand` (nullable), `abstained`, `damageCategory` (WEATHER, NON_WEATHER or NONE, mapped from `label-map.yml`), `satelliteStress`, `dryspellOverlapsCriticalStage`, `plotLevelRainLow`, `integrityOk`.

In `tools/`: interface `IntegrityTools` with `hashImages(ClaimPhotos)` and `readMetadata(ClaimPhotos, ClaimContext)`; interface `ConcordanceClassifier` with `classify(ConcordanceInputs)`. Provide `StubIntegrityTools` and `StubConcordanceClassifier` so nothing is blocked. Person B replaces the stubs.

### T2.4 Forensics agent

- Tools: `hash_images`, `read_metadata`, `grade_bundle`, terminal `submit_forensics`.
- `grade_bundle` wraps the Day 1 `GradingService`: two passes with shuffled anchor order, then the pure function `AgreementGate.decide(List<GradingResult>)` in `core/`, returning the agreed band or ABSTAIN.
- `ForensicsValidator` in code: duplicate or near-duplicate found, field mismatch, screen recapture suspected, or not a crop field means `integrityOk=false` regardless of what the model submits. The model cannot override it.
- System prompt in Appendix B.
- **Done when:** `AgreementGateTest` and `ForensicsValidatorTest` cover: same band gives the band; different bands abstain; recapture suspected gives integrity fail; not a crop field gives integrity fail; a duplicate from the hash report overrides a model claim that all is fine.

### T2.5 BigQuery plumbing (`tools/bq/`)

- `BigQueryService` runs **only** named queries from `protocol/queries/*.sql` with named parameters. No string concatenation of parameters anywhere.
- Table and column names come from `config/bq-schema.yml` (D11). If a name is missing, fail with a clear message; do not guess.
- Read-only, a configurable maximum bytes billed, and a timeout.
- **Done when:** a test proves a query name outside the allowlist is rejected and that parameters are bound, not concatenated.

### T2.6 Concordance tools and agent

- Tools: `query_bigquery(query_name, params)` (allowlisted), `compute_ndvi_anomaly`, `dry_spell_overlap`, `evaluate_index` (runs the frozen `protocol/trigger.sql`), `apply_decision_table` (calls `ConcordanceClassifier`), terminal `submit_concordance`.
- `submit_concordance` takes only the claim ID. The `EvidenceRecord` and outcome are assembled by code from the tool results in the trace.
- If the agent never calls `apply_decision_table`, the run fails; there is no model-chosen default outcome.
- System prompt in Appendix B. `fetch_open_meteo` is not built today (cut list).
- **Done when:** tests with fake tools show the outcome equals the decision-table result and that a model-typed number is never used.

### T2.7 Claim pipeline with two modes

`ClaimPipeline.run(ClaimContext, ClaimPhotos, Mode)` with `Mode = DIRECT | AGENT` (D12). DIRECT calls the same tools in code in a fixed order: integrity, grading, gate, evidence, index, decision table. AGENT lets the two agents choose the order. Both return a `ClaimDecision` with trace, model and prompt versions, anchor IDs and order, evidence timestamps.

### T2.8 Ablation runner (`eval/`, profile `ablation`)

- Calls `FreezeGuard.verify()` first.
- Loads `eval/test_manifest.csv` and builds bundles per D7 and D13.
- Arms: (a) simulated index alone, no Gemini; (b) raw zero-shot Gemini; (c) anchored Gemini with two-pass agreement gate; (d) full three-signal concordance, mode per D12.
- Flags: `--dry-run` (count calls and tokens from the Day 1 averages, print an estimated cost, exit), `--max-bundles N`, `--resume`.
- Writes `out/ablation/` outputs listed in Appendix A and appends a line to `docs/EVAL_LOG.md` (timestamp, git commit, freeze hash, arms, N, cost).
- All Gemini calls go through the cache; identical calls across arms are made once.

### T2.9 Metrics module (`eval/Metrics`, pure Java)

Implements the definitions in Appendix A: confusion matrix, precision, recall, F1, macro-F1 for damage type, risk-coverage sweep, headline statistic, false-escalation rate, natural gap count, latency percentiles and cost per claim. **Done when:** tests against small hand-computed fixtures pass.

### T2.10 Integrity evaluation

Reads Person B's `eval/planted_manifest.csv` (bundle ID, type, image paths) and runs the integrity checks, plus the grading call for recapture and not-a-field cases. Writes `out/ablation/integrity.json` with detection rate per type (resized duplicate, mixed fields, non-field photo, photographed screen) and the false-alarm rate on clean bundles from the test set.

### T2.11 Validation endpoint

`GET /api/validation/metrics` serves `validation/metrics.json`, the risk-coverage points and a summary of `eval/freeze.json` (protocol commit hash and time, model ID, prompt versions). Read-only, no Gemini calls.

### T2.12 Contracts update

Update `contracts/` examples for `EvidenceRecord`, `ClaimDecision` and `AuditRecord` to the real fields. Tell Person B.

### T2.13 Final check

`./mvnw -q verify` green, no secrets, no image files staged.

## 7. Schedule (IST)

| Time | Outside the IDE | In the IDE |
|---|---|---|
| 09:00 to 10:30 | M2.1, M2.2, M2.3 (review), M2.4 | T2.0, T2.3 (publish interfaces by 09:30), T2.2 |
| 10:30 to 12:30 | M2.3 freeze by 12:00, M2.6 | T2.1, T2.4 |
| 12:30 to 14:00 | M2.5 (hard gate), M2.7 | T2.5, T2.6 |
| 14:00 to 15:30 | M2.8 freeze manifest | T2.7, T2.8 (dry-run first), T2.9 |
| 15:30 to 18:00 | M2.9 run the ablation | T2.10, T2.11 while it runs |
| 18:00 to 21:00 | M2.10, M2.11, M2.12 | T2.12, T2.13 |

If you are behind at 15:00, apply the Gate 2 cut order. The ablation must start by 16:00 at the latest, or you reduce the test size (D13).

## 8. Gate 2 checklist

- [ ] `eval/freeze.json` committed and tagged `eval-frozen`; `rubric-frozen` tag exists.
- [ ] Protocol commit hash and time recorded in `docs/EVAL_LOG.md`, earlier than the first test-set call.
- [ ] Ablation ran once; all four arms have results in `out/ablation/`.
- [ ] Metrics table written and readable aloud; the natural gap count noted, whatever it is.
- [ ] Risk-coverage data and integrity detection rate produced.
- [ ] Cost per claim and latency recorded in `docs/NUMBERS_FOR_DECK.md`.
- [ ] `validation/` pushed with no images; `/api/validation/metrics` works on the live URL.
- [ ] Intermediate deploy healthy; known-good revision name noted.

## 9. Risks

- **A late protocol commit** blocks the whole evaluation. Chase Person B at 11:00 and 12:00.
- **Rate limits (429)** during the run. Lower concurrency and resume; the cache protects spend.
- **Preview model drift.** The freeze manifest records the model ID; the model version string returned with each result is logged.
- **Temptation to tune after seeing results.** The guard exists for this. Report, do not tune.
- **Function-calling history errors** on Gemini 3 (see T2.2). If the agent loop fails on every second step, the usual cause is rebuilt history; fix that before anything else.
- **Bundles unavailable (D7).** Single-image mode with the same pipeline, stated openly on the validation page.

## Appendix A: evaluation definitions and outputs

**Arms**

| Arm | Predicts | Notes |
|---|---|---|
| (a) Index alone | Damaged when the frozen index pays | No Gemini |
| (b) Raw zero-shot Gemini | Damaged when the model says damaged | Bare rubric, one pass |
| (c) Anchored, two-pass gate | Damaged when the agreed band is at least MODERATE; abstain when passes disagree | Report coverage, accuracy on covered bundles, and an abstain-counted-as-escalate variant |
| (d) Full concordance | The outcome class from the decision table | Mode per D12 |

**Definitions** (labels come from `labels.csv`, D6; change definitions only before the run)

- **Missed by index:** labelled damaged and the frozen index does not pay.
- **Caught:** missed by index and the outcome class is `PHENOLOGICAL_BASIS_RISK_GAP` or `SPATIAL_BASIS_RISK_GAP`.
- **Routed to human review (not a gap):** missed by index and the outcome class is `EVIDENCE_CONFLICT`. Reported separately; the plan says this is not counted as a gap.
- **Headline catch rate:** caught divided by missed by index (restricted to drought-damaged labels for the drought variant).
- **False escalation rate:** labelled not-damaged plots, index not paying, that FieldProof escalates as a gap, divided by all such plots.
- **Natural gap count:** all test plots whose outcome class is one of the two gap classes, with the split by label.
- **Risk-coverage:** coverage is the share of bundles not abstained at confidence threshold t (confidence is the mean of the two passes); risk is the error rate on those bundles. Sweep t, and add the point for the agreement gate alone.
- **Macro-F1:** over damage types from `label-map.yml`.
- **Cost per claim:** sum of input and output tokens times the configured prices, with a component breakdown. The brief's cost is added on Saturday, so record the grading cost separately now.

**Outputs in `out/ablation/`:** `metrics.json`, `metrics.md`, `risk_coverage.csv`, `gaps.csv`, `failures.jsonl`, `integrity.json`, `per_bundle_results.jsonl`.

## Appendix B: agent system prompts (drafts)

**Forensics agent.** You review a farmer's claim photos for an insurer. You do not decide payouts. Use your tools to check the photos for duplicates, check their metadata, and grade them, then call `submit_forensics`. Call `hash_images` and `read_metadata` before `grade_bundle`. Do not describe or estimate anything yourself that a tool can report. After you submit, your result may be overridden by code if a check failed.

**Concordance agent.** You gather independent evidence for one plot and season for an insurer. You do not decide payouts and you do not classify the claim yourself. Call `evaluate_index`, `compute_ndvi_anomaly` and `dry_spell_overlap` (using `query_bigquery` only with an allowed query name), then call `apply_decision_table`, then `submit_concordance` with the claim ID. Never type a number from memory; the system copies numbers from the tool results.

## Appendix C: outcome classes (from the decision table)

`CONFIRMED_PAYOUT`, `POSSIBLE_OVERPAYMENT`, `PHENOLOGICAL_BASIS_RISK_GAP`, `SPATIAL_BASIS_RISK_GAP`, `EVIDENCE_CONFLICT`, `NON_WEATHER_LOSS`, `CONSISTENT_NO_ACTION`, `INTEGRITY_HOLD`.

| Index | Photo | Satellite | Extra condition | Outcome | Action |
|---|---|---|---|---|---|
| Pays | Damage | Any | none | CONFIRMED_PAYOUT | Fast-track |
| Pays | No damage | Any | none | POSSIBLE_OVERPAYMENT | Review |
| No pay | Weather damage, moderate or worse | Stress | Dry spell overlaps critical growth stage | PHENOLOGICAL_BASIS_RISK_GAP | Escalate |
| No pay | Weather damage, moderate or worse | Stress | No overlap; plot-level rain is low | SPATIAL_BASIS_RISK_GAP | Escalate |
| No pay | Weather damage | Healthy | none | EVIDENCE_CONFLICT | Ask for more photos, human review, not counted as a gap |
| No pay | Pest, disease, weed or nutrient damage | Any | none | NON_WEATHER_LOSS | Route to advisory or other cover |
| No pay | No damage | Healthy | none | CONSISTENT_NO_ACTION | No action |
| Any | Integrity check failed | Any | none | INTEGRITY_HOLD | Hold, no recommendation |
