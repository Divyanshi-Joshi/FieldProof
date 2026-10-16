# GEMINI.md: rules for the AI coding agent

Read this file and `docs/DAY1_PERSON_A.md` before every task. If your tool does not load `GEMINI.md` automatically, this same text is also kept as `AGENTS.md`.

## Project

FieldProof is a reconciliation layer for index insurance. For each plot it compares the insurer's index outcome, the farmer's photos and satellite evidence, finds failures the index missed, and hands each one to a human adjuster with a cited reason.

Core principle: **Gemini perceives and explains, deterministic code decides, a human signs off.** The model never decides a payout. Severity bands, the trigger rule and the outcome class are computed by tested Java code.

## Stack and conventions

- Java 21, Maven with the Maven Wrapper only (`./mvnw`). Do not use a globally installed Maven.
- Spring Boot, latest stable GA release (never a milestone or snapshot).
- Base package `com.fieldproof`, Maven group `com.fieldproof`, artifact `fieldproof`.
- DTOs are Java records. No Lombok. Constructor injection only. JSON via Jackson.
- Gemini is called through the Google GenAI Java SDK (`com.google.genai:google-genai`) in Vertex AI mode using Application Default Credentials. No API keys anywhere.
- Config comes from `application.yml` and environment variables. Model ID, location, temperature, thinking level and media resolution are config values, never hard-coded.

## Package layout

```
com.fieldproof
  config/   FieldProofProperties and startup validation
  api/      REST controllers
  ai/       GeminiGateway, ResponseCache, PromptLibrary, GradingService, AnchorLibrary
  core/     pure Java domain logic (SeverityMapper, later TriggerRule and ConcordanceTable)
  eval/     smoke test and later ablation runners (Spring profiles)
```

**Rule:** code in `core/` must not import Spring, `com.google.genai`, or any Google Cloud class. It is pure Java and unit tested.

## Dependencies

Allowed on Day 1: Spring Boot web and test starters, `com.google.genai:google-genai` (look up the current release on Maven Central, do not guess the version), `org.apache.commons:commons-csv`. Ask me before adding anything else.

## Working rules

1. **Never guess library APIs.** Inspect the dependency's classes or Javadoc, then compile. If a method name is not confirmed by the library itself, say so.
2. **One task at a time.** Implement only the task I name. Do not touch files outside it.
3. **Verify before claiming done.** Run `./mvnw -q verify` and show me the output.
4. **Ask, do not assume.** If a requirement is missing or an open item blocks you, stop and ask. Open items right now: dataset label schema and which labels count as damaged (D6), bundle vs single-image input (D7), approval of the MODERATE, MILD and NONE severity rules (D8), repo visibility (D9), BigQuery dataset location (D10).
5. **Tests for every pure function.** Table-driven where possible.
6. **Small commits** with clear messages.

## Never do

- Never put secrets, keys, tokens or credentials in code, config files, logs or commits.
- Never commit `data/`, `cache/`, `out/`, `*.env` or any dataset image (the dataset licence is unconfirmed).
- Never let the model output a payout, a percentage loss or a final severity band. The model returns observable signs only; code maps them to a band.
- Never hard-code prices, model IDs, regions or project IDs.
- Never pin a `gemini-2.5-*` model. Those versions have retirement dates close to the hackathon window.

## Commands

```
./mvnw -q verify                                   # build and test
./mvnw spring-boot:run                             # run locally (needs gcloud ADC)
./mvnw spring-boot:run -Dspring-boot.run.profiles=smoke   # Day 1 smoke test
./scripts/deploy.sh                                # deploy to Cloud Run (run by a human)
```

## Environment variables

`FIELDPROOF_GCP_PROJECT`, `FIELDPROOF_VERTEX_LOCATION`, `FIELDPROOF_GEMINI_MODEL` (required); `FIELDPROOF_GEMINI_TEMPERATURE`, `FIELDPROOF_GEMINI_THINKING`, `FIELDPROOF_GEMINI_MEDIA_RES` (optional). Startup must fail fast with a clear message if a required value is missing.
