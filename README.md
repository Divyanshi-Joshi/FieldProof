# 🌾 FieldProof — Developer Onboarding & Architecture Overview

---

## 1. Executive Summary: What is FieldProof in Plain English?

In developing agricultural economies (like Kenya and India), smallholder farmers buy **Parametric Weather-Index Crop Insurance**.

- **How it works:** Instead of sending an inspector to every farm, an insurer automatically pays out if a local weather station records rainfall below a certain trigger (e.g., the 30th percentile).
- **The Fatal Flaw ("Basis Risk"):** Weather stations or satellite grids are often 15–30 km away. A cloudburst might hit the weather station while a farmer's plot 10 km away experiences total drought. The station says *"Normal rain"*, the automated index pays **$0**, and the farmer goes bankrupt. Conversely, an area index might trigger payouts for farmers whose crops were completely healthy (**Overpayment**).

### What FieldProof Does
FieldProof is an AI-assisted claims reconciliation platform that bridges this gap:

1. **Farmer uploads 3 smartphone photos from the field.**
2. **Gemini Vision** grades observable agronomic symptoms (leaf rolling, stunting, leaf drying) calibrated against visual reference anchors.
3. **Image Forensics** checks for duplicate fraud (pHash/dHash), screen recaptures, and EXIF mismatch.
4. **A 100% Deterministic Java Core** (zero hallucinating AI in the payout calculation) cross-references the **Weather Index + Farmer Photos + Sentinel-2 Satellite Vegetation Index (NDVI)** to resolve basis-risk disputes in seconds instead of 45 days.
5. **The Index Doctor** feeds field dispute data back to insurers to dynamically recalibrate policy rainfall triggers for next season.

---

## 2. Repository Tour: How the Code is Structured

```text
AI_builder/
├── core/               # PURE JAVA DETERMINISTIC LOGIC (Zero AI)
│   ├── ConcordanceTable.java   # 7 outcome classes (Basis risk, confirmed payout, conflict)
│   ├── SeverityBand.java       # Translates 0-3 physical signs into NONE, MILD, MODERATE, SEVERE
│   └── TriggerRule.java        # Weather index trigger calculations
│
├── tools/              # IMAGE FORENSICS & SIMULATION
│   ├── ImageIntegrityTools.java # Perceptual hashing (pHash, dHash), EXIF metadata inspection
│   └── IndexDoctorService.java  # Historical plot simulation across percentiles (5% - 60%)
│
├── api/ & service/     # SPRING BOOT BACKEND (Java 25)
│   ├── ClaimController.java     # /api/claims (Triage queue, photo upload, adjuster sign-off)
│   ├── ValidationController.java# /api/validation/summary (4-Arm ablation metrics, unit economics)
│   ├── PolicyController.java    # /api/policy/clauses (Policy text & clause citation index)
│   └── IndexDoctorController.java# /api/index-doctor (Live recalibration simulation)
│
├── contracts/          # TYPE SAFETY CONTRACTS
│   ├── *.schema.json   # JSON Schemas (GradingResult, EvidenceRecord, ClaimDecision, AuditRecord)
│   └── demo_cases.mock.json # 8 gold-standard evaluated claim bundles
│
├── protocol/           # REGULATORY IMMUTABILITY
│   ├── COMMIT_HASH.txt # Frozen commit hash (0371cad)
│   ├── FROZEN_TRIGGER_PROTOCOL.md # Pre-evaluation locked trigger rules
│   └── frozen_trigger.sql         # BigQuery SQL implementation of the frozen protocol
│
└── frontend/           # REACT + TYPESCRIPT + TAILWIND CSS
    ├── src/components/HeroLanding.tsx      # Entry screen & persona launchpad
    ├── src/components/FarmerView.tsx       # Farmer mobile camera upload & instant status
    ├── src/components/InsurerView.tsx      # Adjuster 3-signal concordance triage cockpit
    ├── src/components/IndexDoctorView.tsx  # Interactive policy recalibration slider
    └── src/components/ValidationView.tsx   # 4-arm ablation study & unit economics
