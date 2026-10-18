# 🛰️ FieldProof — Core Features & Architectural Guide

FieldProof is an automated, AI-assisted reconciliation layer for parametric index crop insurance. It bridges the gap between conventional macro-level weather indices and farmer-level ground reality.

> **Foundational Principle:**  
> *"Gemini perceives and explains; Google Earth Engine independently calculates; deterministic Java decides; a human adjuster signs off."*

---

## 🛰️ Strict Architectural Boundary: Google Geospatial Engine vs. Gemini

A core requirement of financial insurance regulation is that **generative models must never hallucinate satellite physics or determine financial liabilities**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 HOW RESPONSIBILITIES ARE SPLIT                                   │
├─────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│   Google Earth Engine (GEE) & Geospatial Engine │   Gemini Perception & Policy Grounding         │
├─────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ • Sentinel-2 MSI L2A 10m (B4, B8, B11)          │ • Ground photo feature extraction (0–3 scale)  │
│ • Sentinel-1 SAR C-band radar soil moisture     │ • Concept-bottleneck physical symptoms         │
│ • Mathematical NDVI & NDRE calculation          │ • Policy citation grounding (PMFBY §7.1.4)     │
│ • 3-Year Kharif baseline (μ, σ)                 │ • Multilingual farmer voice explanations       │
│ • Statistical Z-Score (Z = [obs - μ] / σ)       │                                                │
│ • DeepMind ALU 1.42 ha parcel atomic unit       │ ❌ NEVER invents satellite numbers             │
│ • BigQuery GIS joins with AgriStack             │ ❌ NEVER determines payout amounts             │
└─────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## Architecture: The "Orbit-to-Field" Decision Engine

FieldProof solves the fatal flaw of index insurance—**basis risk** (when an insurance index fails to pay a farmer who suffered real crop loss, or pays a farmer who suffered no loss).

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   GROUND-LEVEL EVIDENCE                                │
 │   Farmer Photos (1-3 images) ──► Image Integrity Forensics (pHash/dHash/EXIF/Moiré)   │
 │                                            │                                           │
 │                                            ▼                                           │
 │                   Two-Pass Calibrated Gemini Vision Forensics                          │
 │                   [Signs: leaf_rolling, canopy_senescence, stunting, soil_cracking]    │
 └────────────────────────────────────────────┬───────────────────────────────────────────┘
                                              │
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   ORBIT-LEVEL EVIDENCE                                 │
 │   Farmer Plot Centroid / GPS Polygon (e.g., Beed, MH: Lat: 18.9891, Lon: 75.7601)      │
 │                                            │                                           │
 │                                            ▼                                           │
 │                       Google Earth Engine & BigQuery Geospatial                        │
 │      • Optical: COPERNICUS/S2_SR_HARMONIZED (Sentinel-2 L2A 10m Reflectance)           │
 │      • Radar: Sentinel-1 C-Band SAR (Dielectric Surface Soil Moisture: 0.18 m³/m³)     │
 │      • Rainfall: UCSB-CHG/CHIRPS/DAILY (0.05° High-Resolution Precipitation)            │
 │      • 3-Year Historical Baseline (2023–2025 Kharif Seasonal Mean μ & Std Dev σ)       │
 │      • DeepMind ALU: 1.42 ha (3.51 ac) Parcel Boundary joined with AgriStack           │
 │      • Dynamic NDVI Anomaly Z-Score (Z = -1.90σ) & Dry Spell Duration (21 days)        │
 └────────────────────────────────────────────┬───────────────────────────────────────────┘
                                              │
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                             DETERMINISTIC CONCORDANCE ENGINE                           │
 │                                (Pure Java 21 Decision Core)                            │
 │                                                                                        │
 │   Index Trigger (index_pays) + Gemini Severity Band + Earth Engine Orbit Stress        │
 │                                            │                                           │
 │                                            ▼                                           │
 │             1 of 8 Mutually Exclusive Outcomes (e.g. PHENOLOGICAL_GAP)                 │
 └────────────────────────────────────────────┬───────────────────────────────────────────┘
                                              │
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                              HUMAN ADJUSTER SIGN-OFF & AUDIT                           │
 │   Policy-Cited Brief (§7.1.4) ──► Fast-Track Payout / Reject ──► Immutable BigQuery    │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature 1: Hyper-Local Geospatial Basis Risk Resolution (Google Earth Engine, DeepMind ALU & BigQuery GIS)

### The Problem It Solves
Area-yield and weather index insurance fail systematically because satellite rainfall grids (CHIRPS / ERA5) and reference weather stations operate at coarse resolutions (5–10 km). A micro-drought or localized dry spell can completely wipe out an individual village's crop while a station 8 km away records adequate seasonal rainfall, triggering a false-negative zero payout.

### Google Cloud & Google AI Technologies Used
1. **Google Earth Engine (GEE) REST API**:
   - **Sentinel-2 MSI Level-2A (10m)**: Direct planetary-scale access to multispectral bands B4 (Red: 665 nm), B8 (NIR: 842 nm), and B11 (SWIR: 1610 nm) computing plot-level NDVI, NDRE, and SWIR moisture reflectance.
   - **Sentinel-1 C-Band Synthetic Aperture Radar (SAR)**: Active radar penetration through heavy monsoon cloud cover to measure ground surface roughness and dielectric soil moisture deficit (volumetric soil moisture $0.18\text{ m}^3/\text{m}^3$).
   - **Dynamic Z-Score Formulation**:
     $$Z = \frac{\text{NDVI}_{\text{observed}} - \mu_{\text{baseline}}}{\sigma_{\text{baseline}}}$$
     Calculated across a 3-year Kharif historical baseline envelope (July–October, 2023–2025). When $Z \le -1.5$, vegetative drought stress is mathematically proven.
2. **Google DeepMind Agricultural Landscape Understanding (ALU & AMED)**:
   - Frontier foundation models developed by Google DeepMind's AnthroKrishi team in India.
   - Delineates individual smallholder farms as discrete "atomic units" (e.g. 1.42 ha / 3.51 ac parcel boundary), isolating farm boundaries from surrounding vegetation and establishing sowing dates and crop growth stages.
3. **BigQuery Geospatial (GIS)**:
   - High-throughput spatial predicates (`ST_CONTAINS`, `ST_GEOGPOINT`, `ST_INTERSECTS`) executing sub-second polygon joins between India's AgriStack geo-referenced parcel registry (`IN-MH-BEE-0142`) and planetary satellite raster grids.

### How Backend Implements It
- **[`EarthEngineService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/tools/gee/EarthEngineService.java)**: Authenticates via Google Cloud Application Default Credentials (ADC) to Earth Engine REST API, extracts plot polygon NDVI $z$-scores ($\frac{\text{observed} - \mu}{\sigma}$), computes dry-spell duration, and reads Sentinel-1 SAR soil moisture.
- **[`OrbitToFieldService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/ai/OrbitToFieldService.java)**: Harmonizes macro-station weather grid data with DeepMind ALU 1.42 ha boundaries and 10m Sentinel-2 / Sentinel-1 telemetry into structured plain-English basis-risk summaries.

### Where It Sits in the UI & How It Delivers Instant Conclusions
Located in **Claims Desk > Claim Detail > Multi-Source Telemetry & Resolution Breakdown**:
1. **Executive Conclusion Banner**:
   - Immediately states the determination: *"Reconciliation Conclusion: Missed by Weather Index • Action: Payout Recommended (§7.1.4)"*.
   - Explains in plain English: *"The 10km regional weather station reported 341 mm seasonal rain (above the 290 mm index trigger), resulting in a standard denial. However, hyper-local 10m Sentinel-2 telemetry reveals a 21-day dry spell during the critical flowering stage, driving vegetative stress to -1.90σ below the 3-year Kharif baseline. Under PMFBY Policy Clause §7.1.4, the ground evidence overrides the coarse index."*
2. **3-Box Resolution Contrast Hierarchy**:
   - **Macro Weather Grid (10 km)**: CHIRPS 341 mm vs 290 mm trigger $\to$ Index did not pay (₹0).
   - **DeepMind ALU & AgriStack (1.42 ha)**: AgriStack ID `IN-MH-BEE-0142`, 3.51 ac boundary isolated, SAR Soil Moisture Deficit $0.18\text{ m}^3/\text{m}^3$.
   - **Earth Engine Sentinel-2 (10 m)**: NDVI 0.31 ($-1.90\sigma$ vegetative stress), 21-day flowering dry spell $\to$ Severe crop damage confirmed.
3. **Interactive Orbit Telemetry Inspector**:
   - 3-year Kharif baseline envelope comparison (2023, 2024, 2025 vs 2026).
   - Dynamic satellite metadata, cloud score (<15%), and instant recalculation synchronization.


---

## Feature 2: Gemini 2.0 Spatial Vision Grounding & Two-Pass Calibrated Vision Forensics

### The Problem It Solves
Directly prompting an LLM to "estimate the damage percentage" or "decide if this claim should be paid" results in severe hallucinations, camera lighting bias, and legal non-compliance. Furthermore, claims adjusters cannot afford to guess which pixels the model inspected when assigning severity scores.

### Google AI Technologies Used
1. **Gemini 2.0 Spatial Vision Grounding**:
   - Natively outputs normalized 2D coordinate bounding boxes `[box_2d: [ymin, xmin, ymax, xmax]]` in a 0–1000 coordinate scale.
   - Every physical symptom scored in the concept-bottleneck rubric is anchored directly to concrete pixel coordinates on the farmer's photo:
     - `Severe Leaf Rolling`: e.g. `[180, 240, 520, 710]` (94% confidence) — upper-whorl pencil-like curling.
     - `Canopy Senescence`: e.g. `[460, 110, 810, 590]` (89% confidence) — progressive chlorosis and necrosis.
     - `Soil Cracking`: e.g. `[620, 290, 940, 850]` (96% confidence) — polygonal desiccated clay soil fissures.
2. **Concept-Bottleneck Agronomic Rubric**:
   - The model is strictly constrained to scoring four physical agronomic signs on an integer 0–3 scale (`leaf_rolling_0_3`, `canopy_senescence_0_3`, `stunting_0_3`, `soil_cracking_visible`).
   - The model **never** outputs a monetary payout or a final severity classification.
3. **Tri-Anchor Calibration (`AnchorLibrary`)**:
   - Inferences include three fixed reference images (`anchor_healthy`, `anchor_moderate`, `anchor_severe`) to eliminate camera exposure and phone sensor drift.
4. **Two-Pass Agreement Gate**:
   - Two independent inferences execute with shuffled anchor orders (`pass_1` and `pass_2`).
   - Pure Java code maps the sign vectors to severity bands. If passes disagree, the system outputs **`ABSTAIN`** and routes the claim to a human agronomist.

### Where It Sits in the UI
Located on **Claims Desk > Claim Detail > Farmer Field Evidence**:
- **Interactive Multi-Photo Spatial Grounding Inspector**:
  - Focuses high-resolution photos with dynamic SVG/canvas bounding box overlays.
  - Interactive toggle button: **"Spatial Grounding: Active"** with real-time symptom highlights.
  - Hovering any bounding box highlights the symptom card below and displays the exact physical symptom explanation and model confidence score.
  - Thumbnail selector with instant symptom counters (e.g. `2 symptoms detected`).
  - Regulatory **Anti-Hallucination Audit Guarantee** badge confirming pixel grounding.

---

## Feature 3: Deterministic Concordance Decision Core

### The Problem It Solves
Insurance claims require explainable, rule-based determinations compliant with financial regulatory standards. AI must never decide a payout.

### How It Works
FieldProof implements pure Java decision logic in `com.fieldproof.core.ConcordanceTable`. It reconciles three independent signals:
1. **Signal 1 (Ground)**: Gemini agreed severity band.
2. **Signal 2 (Index)**: Area weather-station rainfall trigger ($P \le 290\text{ mm}$).
3. **Signal 3 (Orbit)**: Google Earth Engine Sentinel-2 NDVI stress ($Z \le -1.5$) & CHIRPS dry-spell timing.

### The Concordance Matrix

| Outcome Class | Photo Severity | Index Triggers? | Satellite Stressed? | Phenological Dry Spell? | Recommended Action | Cited Clause |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CONFIRMED_PAYOUT`** | MODERATE / SEVERE | YES | YES / NO | — | `FAST_TRACK` | §2.1 |
| **`POSSIBLE_OVERPAYMENT`** | NONE / MILD | YES | NO | — | `REVIEW` | §2.2 |
| **`PHENOLOGICAL_BASIS_RISK_GAP`** | MODERATE / SEVERE | NO | YES ($Z \le -1.5$) | YES (At flowering) | `ESCALATE` | §4.2 / §7.1.4 |
| **`SPATIAL_BASIS_RISK_GAP`** | MODERATE / SEVERE | NO | YES ($Z \le -1.5$) | NO (Low local rain) | `ESCALATE` | §4.3 / §7.1.3 |
| **`EVIDENCE_CONFLICT`** | MODERATE / SEVERE | NO | NO ($Z > -1.5$) | — | `ASK_MORE_PHOTOS_HUMAN_REVIEW` | §5.1 |
| **`NON_WEATHER_LOSS`** | PEST / DISEASE | NO | — | — | `ROUTE_TO_ADVISORY` | §6.1 |
| **`CONSISTENT`** | NONE / MILD | NO | NO | — | `NO_ACTION` | §1.1 |
| **`INTEGRITY_HOLD`** | Failed checks | — | — | — | `HOLD_NO_RECOMMENDATION` | §8.1 |

---

## Feature 4: Planted Fraud & Image Forensics Pipeline

### The Problem It Solves
Parametric claims are susceptible to recycled photos, duplicate submissions across seasons, and photographed screens.

### How It Works
Before any image is graded by Gemini, it passes through `ImageIntegrityTools`:
1. **Intra-Claim Duplicate Detection**: Computes 64-bit perceptual hashes (`pHash` and `dHash`). If Hamming distance $\le 10$, flags duplicate photos within the claim.
2. **Cross-Claim Historical Fraud Detection**: Checks hashes against historical claim registries to detect photos re-used from previous years.
3. **EXIF & GPS Boundary Inspection**: Extracts EXIF tags to verify capture timestamp and validates that GPS coordinates fall within the declared county boundaries.
4. **Screen Recapture & Moiré Analysis**: Gemini flags photographs taken of computer or phone monitors (`screen_recapture_suspected`).

---

## Feature 5: Index Doctor (Interactive Recalibration Simulator)

### The Problem It Solves
Insurers frequently struggle to choose the optimal percentile trigger (e.g. 20th vs 30th vs 40th percentile). Setting it too low causes high farmer basis risk; setting it too high causes insurer insolvency.

### How It Works
- Located on the **Index Doctor** tab in the UI.
- Powered by `protocol/index_doctor_slider.sql` and `IndexDoctorService.java`.
- An interactive slider lets adjusters simulate trigger percentiles from 10% to 50% in real-time across hundreds of historical seasons.
- Dynamically calculates:
  - **Basis-Risk Gap Rate %**: Farmers who lost crops but received no payout.
  - **Overpayment Rate %**: Payouts made where crops did not suffer damage.
  - **Payout Frequency & Projected Outlay (₹ INR)** across individual districts (Beed, Jalna, Latur, Akola, Dewas).

---

## Feature 6: Policy Agent & Multilingual Farmer Messenger

### The Problem It Solves
Adjusters require legally defensible policy citations, while smallholder farmers need transparent, jargon-free explanations in their native language.

### How It Works
1. **PolicyIndex & BriefGuard**:
   - Strict allowlist of policy clauses loaded from `policy/clauses.json`.
   - Validates that adjuster briefs cite only legitimate, active policy sections.
2. **Farmer Message Localization**:
   - Generates farmer-facing text in **English (`en`)**, **Hindi (`hi`)**, and **Marathi (`mr`)**.
   - Transparently explains why a claim was fast-tracked, held, or escalated, and includes statutory disclaimers that human adjusters make final decisions.

---

## Feature 7: Immutable BigQuery Audit Ledger

### The Problem It Solves
Regulatory compliance requires every decision to be reproducible and tamper-evident.

### How It Works
When an adjuster signs off on a claim, `BigQueryAuditWriter` appends an immutable record containing:
- `audit_id`, `claim_id`, `plot_id`, and `timestamp_utc`.
- `model_version` (e.g., `gemini-3-flash-preview`).
- `prompt_version` and `anchor_image_ids`.
- `frozen_protocol_commit_hash`: Exact Git commit hash of the locked trigger rules.
- `adjuster_id`, `adjuster_action` (`APPROVED`, `REJECTED`, `ESCALATED`), and adjuster notes.
- If the audit write fails, the decision transaction fails fast (HTTP 503) to prevent un-audited claim closures.

---

## Summary of Verification Commands

```bash
# 1. Run all backend tests (concordance, integrity, Earth Engine, policy)
./mvnw -q verify

# 2. Run the Orbit-to-Field Earth Engine standalone CLI demo
python scripts/orbit_to_field_gee.py --plot-id P-0142 --lat -1.8021 --lon 37.6253

# 3. Launch full local system
./scripts/start.sh
```
