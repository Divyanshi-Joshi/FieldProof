# Person A, Day 4 (Sun Oct 18) implementation plan: finish, harden and submit

Reference for Person A and for the AI coding agent (Antigravity / Gemini Code Assist). Save as `docs/DAY4_PERSON_A.md`. Section 5 is manual work outside the IDE. Section 6 is work handed to the agent. IDs: manual steps are `M4.x`, agent tasks are `T4.x`, open items continue the `D` numbering.

**Dependency note.** This plan assumes Saturday (Oct 17, Day 3) finished the product: upload page, triage list, claim view, Index Doctor slider, validation tab, 6 to 8 seeded demo cases, cited brief, language toggle, audit log, and a feature freeze at 10 PM. Day 3 does not have its own plan file yet. If Saturday is incomplete, apply the cut order in section 8 before doing anything else today.

## 1. Goal for today and the submission rule

Submit by **about 6 PM IST** on Oct 18. The official deadline is 23:59 UTC on Oct 18, which is **05:29 AM IST on Oct 19**. Everything after 6 PM is buffer only.

Today is **bug fixes only**. Allowed: crashes, wrong or missing data, broken links, anything that blocks the 3-minute demo. Not allowed: new features, prompt changes, threshold changes, model changes without a failure, anchor changes, protocol edits. Changing any frozen item invalidates the evaluation numbers and the freeze guard will fail.

By the end of today:

1. The deployed link works on a laptop, in a private window and on a phone over mobile data.
2. The repo is public, builds from a fresh clone, and contains no secrets or dataset images.
3. The README, architecture source and unit-economics numbers are final and match the measured results.
4. The submission is in, and you have a confirmation.

## 2. Inputs from Day 3 (fill in before you start)

| Item | Value |
|---|---|
| Deployed URL | |
| Last known-good Cloud Run revision | |
| Pinned model ID and retirement date | |
| Demo cases seeded and cached (list) | |
| Open bug list from Saturday's rehearsal | |
| Feature freeze held at 10 PM? | |
| Number of Gemini calls cached for demo cases | |
| Measured cost per claim (grading + brief) | |
| `e` (share escalated or abstained) | |
| Protocol commit hash and time | |

## 3. Decisions and open items

### Decided

| Topic | Decision | Reason |
|---|---|---|
| Change policy | Bug fixes only, each with a test where practical, each logged in `docs/CHANGELOG_DAY4.md` | Protect the frozen evaluation |
| Last planned deploy | 15:00 IST | Leaves time to test and record |
| After the last deploy | No redeploy unless something is broken | The plan's buffer rule |
| Rollback | Keep the known-good revision name and shift traffic back if a deploy breaks | Safe recovery |
| Model failure fallback | Demo cases are cached, so the recorded demo survives; for live uploads switch the model by environment variable only and disclose it in the README | Honesty |

### Open items

| ID | Question | Needed by |
|---|---|---|
| D9 | Repo visibility: the submission needs a public repo with no secrets. Confirm you are making it public today | 12:00 |
| D16 | Cloud Run `--min-instances 1` through the judging window to avoid cold starts? It costs money while idle. Check current Cloud Run pricing and decide | 14:00 |
| D17 | Is resubmission allowed in the portal? Check the event FAQ and the form | 16:00 |
| D18 | Who records and uploads the video, and where is it hosted (the link must work without login)? The plan assigns the video to Person B | 09:00 |
| D19 | Unit-economics `C_visit` value: the plan's $8 is a labelled placeholder. Keep it labelled, or has a buyer given a number? | 12:00 |
| D20 | Verify the PMFBY facts and every `(verify)` item still in the slides and README: resolve or remove | 14:00 |

## 4. Hand-offs with Person B

| By | From | To | What |
|---|---|---|---|
| 09:00 | B | A | Saturday bug list and any known data problems |
| 12:00 | A | B | Final numbers from `docs/NUMBERS_FOR_DECK.md`, `docs/unit_economics.md`, and the protocol commit hash |
| 12:30 | A | B | Architecture source `docs/architecture.mmd` and the README link for the deck |
| 14:00 | B | A | Final video link and deck link for the submission form |
| 15:00 | A | B | Last deploy done; any later change needs both of you to agree |

## 5. Part 1: outside the IDE (you do these by hand)

### M4.1 State check (08:30)

```
source ~/fieldproof.env
git pull
./mvnw -q verify
gcloud run revisions list --service fieldproof --region $CR_REGION
```

Fill in section 2. Open the live URL and walk through the demo path once. Write every problem on the bug list, each tagged **blocker** (breaks the 3-minute demo or loses data), **visible** (a judge would notice) or **cosmetic**. Fix blockers first, visible next, cosmetic only if time remains.

### M4.2 Re-check the pinned Gemini model (08:45)

Call `/api/gemini/ping` on the live service and run the O7 curl test from your terminal. Re-read the model's retirement date on the Vertex AI model versions page. If the model is fine, change nothing. If it fails:

1. The cached demo cases still work, so the recorded demo is safe.
2. For live uploads, switch only the environment variable `FIELDPROOF_GEMINI_MODEL` to a working model with `gcloud run services update fieldproof --region $CR_REGION --update-env-vars FIELDPROOF_GEMINI_MODEL=<model>`.
3. State in the README that the evaluation was run on the original model and that live uploads use the replacement. Do not re-run the ablation.

### M4.3 Secrets and data scan (09:00, before the repo goes public)

```
git grep -nIE 'AIza[0-9A-Za-z_-]{35}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|"private_key"'
git log --all --oneline -- data cache out '*.env' '*.json' | head
git ls-files | grep -Ei '\.(jpg|jpeg|png|heic)$'
```

Expected: nothing from the first command, nothing sensitive from the second, and the third lists only images you are sure you may publish (ideally none). Also run a dedicated secrets scanner such as gitleaks if you have one. If anything sensitive or any dataset image ever entered history, it is in history even if deleted: rewrite history with `git filter-repo` or BFG **before** making the repo public, rotate any exposed key, and tell Person B to re-clone. Do not skip this.

### M4.4 Make the repo public (after M4.3, D9)

Confirm the repo has: the frozen protocol file with its visible commit, `eval/freeze.json`, `docs/EVAL_LOG.md`, `validation/` metrics (no images), the README, `GEMINI.md`, and the plan files. Confirm the dataset licence text does not forbid linking to it, and that you only link to the dataset and never redistribute it.

### M4.5 Fresh-clone test (after any fix)

```
cd /tmp && rm -rf fp-clone && git clone <repo-url> fp-clone && cd fp-clone
./mvnw -q verify
```

It must build and pass tests with no local files. Missing-file failures here mean the repo is not reproducible.

### M4.6 Protect the public service (before the last deploy)

The service is public and calls Gemini, so a stranger could run up your bill. Set limits at deploy time:

```
gcloud run services update fieldproof --region $CR_REGION --max-instances 3 --concurrency 20 --timeout 120
```

Check the billing report for yesterday's spend. Keep the $15 and $30 budget alerts. Decide D16 (minimum instances) after reading the current pricing page.

### M4.7 Last planned deploy (by 15:00)

```
./scripts/presubmit_check.sh
./scripts/deploy.sh
gcloud run revisions list --service fieldproof --region $CR_REGION
```

Write the new revision name next to the previous one. If the deploy breaks something, roll back:

```
gcloud run services update-traffic fieldproof --region $CR_REGION --to-revisions=<KNOWN_GOOD_REVISION>=100
```

### M4.8 Test the live link (15:00 to 16:00)

- Private window on a laptop.
- A real phone on mobile data (not Wi-Fi): upload flow, camera input, language toggle.
- Each seeded demo case: phenological gap, spatial gap, evidence conflict, non-weather loss, rejected duplicate, flagged bad photo, confirmed payout.
- The validation tab shows the protocol commit hash and time.
- A stranger runs the 3-minute demo with no help.
- Time a cold start (first request after 15 minutes idle) so you know what a judge will see.

### M4.9 Submission package check (16:00)

| Item | Done |
|---|---|
| BFSI theme selected in the portal (confirm it can still be changed if needed) | |
| Deployed link works (M4.8) | |
| Video under 3 minutes, with subtitles, link opens without login | |
| Public GitHub repo, no secrets (M4.3, M4.4) | |
| Deck: problem, evidence, competitor landscape, solution, pipeline, ablation results, unit economics, limitations | |
| Architecture slide names Cloud Run, Vertex AI (Gemini), BigQuery and Cloud Storage | |
| Persona and numbers labelled as Kenya; PMFBY facts verified (D20) | |
| Every `(verify)` item resolved or removed | |
| Slide numbers match `docs/NUMBERS_FOR_DECK.md` exactly | |

### M4.10 Submit (17:00 to 18:00)

Fill in the portal with the deployed link, video link, repo link and deck. Re-open each link from the portal's preview. Submit. Take a screenshot of the confirmation and save the confirmation email. Check D17 for the rule on resubmission before you change anything afterwards.

### M4.11 After submission

Do not redeploy unless something is broken. Do not delete the Cloud Run service, bucket or BigQuery tables until results are announced; judges may open the link later. Keep the budget alerts on. Note the final revision name.

## 6. Part 2: in the IDE (the agent builds these)

### How to drive the agent

Paste this at the start of each task, changing only the task ID:

> Read `GEMINI.md` and `docs/DAY4_PERSON_A.md`. Implement task T4.<n> only. Today is a bug-fix day: do not add features, and never change prompts, anchors, thresholds, the protocol or the model. Do not touch files outside the task. If anything is unclear, stop and ask me instead of assuming. Run `./mvnw -q verify` and show me the output before you say you are done.

### T4.1 README.md (repo root)

Sections, in order:

1. One-paragraph pitch: FieldProof reconciles the index, farmer photos and satellite evidence, finds failures the index missed, and hands each to a human adjuster with a cited reason.
2. The principle: Gemini perceives and explains, code decides, a human signs off.
3. Architecture (a Mermaid diagram of the nine-step pipeline) naming Cloud Run, Vertex AI (Gemini), BigQuery and Cloud Storage.
4. Run it locally: prerequisites (JDK 21, gcloud with Application Default Credentials), environment variables, build and run commands.
5. Reproduce the evaluation: the freeze manifest, how to verify the protocol commit hash (`git log --follow` command), and the commands to run the ablation.
6. Results: copied from `validation/metrics.md`, including the natural gap count and the failure cases. No numbers that are not in `validation/`.
7. What we do not claim: no certified accuracy, no regulatory approval, no real insurer contract, no replacement for the agronomist, not fraud-proof, the index is a transparent rule applied to historical plots, results are decision support on Kenyan data.
8. Data: Eyes on the Ground dataset, with the citation and licence link. No images are included.
9. Model note: the model ID used for the evaluation, and the replacement model if M4.2 forced one.

Never include keys, project IDs that you consider private, or any dataset image.

### T4.2 Architecture source

Create `docs/architecture.mmd` (Mermaid) from the nine-step pipeline: capture, integrity checks, grading, agreement gate, evidence, frozen index rule, three-signal table, cited brief, adjuster, audit log, Index Doctor. Colour-code Gemini steps, the human step and deterministic code. You export it to an image for the slide by hand.

### T4.3 Unit-economics report

An `eval/` profile `economics` that reads the cached token usage and `validation/metrics.json` and writes `docs/unit_economics.md` with:

- Measured cost per claim from token counts times the configured prices, broken into grading and brief.
- Measured `e` (the share escalated or abstained).
- The formula `Savings = N x (1 - e) x (C_visit - C_AI)` with `N = 1000`, `e` and `C_AI` measured, and `C_visit` as a clearly labelled placeholder (D19).
- A sentence that `C_visit` is an assumption to be replaced with the buyer's number, and that the figures are a model, not evidence of savings.

**Done when:** a test checks the arithmetic with fixture values.

### T4.4 Presubmit check script `scripts/presubmit_check.sh`

Stops with a non-zero exit code if any of these fail, and prints which one:

1. `./mvnw -q verify` fails.
2. The secret-pattern `git grep` from M4.3 finds anything.
3. Any image file is tracked by git.
4. `eval/freeze.json` is missing or `FreezeGuard` fails (the frozen files changed).
5. A required environment variable is empty.
6. `/api/gemini/ping` against the configured model fails.

### T4.5 Public endpoint hygiene (only if not already done on Saturday)

- `/api/gemini/ping` is removed or requires a header token from an environment variable.
- Any endpoint that calls Gemini has a simple in-memory limit (requests per minute per client and a daily cap from config) behind a config flag, with a test. Cached demo cases are exempt and never call Gemini.
- Return a clear message when a limit is hit.

Keep this small. If it takes more than 45 minutes, stop and rely on the Cloud Run limits in M4.6.

### T4.6 Bug fixes from the list

One task per bug, in priority order (blockers, then visible). For each: reproduce, write a failing test if practical, fix, rerun `./mvnw -q verify`, add a line to `docs/CHANGELOG_DAY4.md` (bug, cause, fix, commit). Never touch prompts, anchors, thresholds or the protocol.

### T4.7 Final tidy

Remove debug logging that could expose claim data, confirm `.gitignore` still covers `data/`, `cache/`, `out/` and `*.env`, and check that `validation/` contains no images.

## 7. Schedule (IST)

| Time | Outside the IDE | In the IDE |
|---|---|---|
| 08:30 to 09:30 | M4.1, M4.2, M4.3 | none (triage the bug list) |
| 09:30 to 12:00 | M4.5 after each fix | T4.6 (blockers, then visible), T4.1 |
| 12:00 to 14:00 | M4.4 repo public, hand numbers to Person B | T4.3, T4.2, T4.4, T4.5 if needed |
| 14:00 to 15:00 | M4.6, M4.7 last planned deploy | T4.7 |
| 15:00 to 16:00 | M4.8 live-link tests | only fixes for blockers found |
| 16:00 to 17:00 | M4.9 package check | none |
| 17:00 to 18:00 | M4.10 submit | none |
| After 18:00 | M4.11 buffer only | none |

## 8. If Saturday was not finished (cut order)

Cut, in this order: adjuster copilot chat, live Open-Meteo demo, ADK, the third language, the policy PDF (plain text is enough), map polish. Never cut: BigQuery, the integrity checks, the frozen protocol, the three-signal concordance, Index Doctor, the validation tab, the Cloud Run deployment, the video. If a never-cut item is missing, tell Person B before 10:00 so the video and deck show only what exists.

## 9. Final checklist

- [ ] Pinned model rechecked; retirement date noted.
- [ ] Secrets and data scan clean; repo public; fresh clone builds.
- [ ] README, `docs/architecture.mmd`, `docs/unit_economics.md` final and consistent with `validation/`.
- [ ] Last deploy done by 15:00; known-good revision recorded; rollback command tested in your notes.
- [ ] Live link tested in a private window and on a phone over mobile data.
- [ ] Video under 3 minutes with subtitles; deck complete; all `(verify)` items resolved or removed.
- [ ] Submitted by about 18:00 IST; confirmation saved.
- [ ] Service, bucket and tables left running after submission.
