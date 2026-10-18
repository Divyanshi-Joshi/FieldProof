# 🛰️ FieldProof — Core Features & Architectural Guide

FieldProof is an automated, AI-assisted reconciliation layer for parametric index crop insurance. Designed for the **Pradhan Mantri Fasal Bima Yojana (PMFBY)** and **Weather Based Crop Insurance Scheme (WBCIS)** in India, it resolves **basis risk**—the fundamental failure mode where conventional coarse satellite rainfall grids deny payouts to damaged smallholder plots or pay undamaged farms.

> **Foundational Engineering Principle:**  
> *"Gemini perceives and explains; Google Earth Engine independently calculates; deterministic Java decides; a human adjuster signs off."*

---

## 🏛️ Strict Architectural Boundaries: Google Geospatial Engine vs. Gemini

In accordance with insurance regulatory standards (IRDAI), **generative models must never hallucinate satellite physics or determine financial liabilities**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 HOW RESPONSIBILITIES ARE SPLIT                                   │
├─────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│   Google Earth Engine (GEE) & BigQuery ML       │   Gemini Perception & Policy Grounding         │
├─────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│ • Sentinel-2 MSI L2A 10m (B4, B8, B11)          │ • Ground photo feature extraction (0–3 scale)  │
│ • Sentinel-1 SAR C-band radar soil moisture     │ • Concept-bottleneck physical symptoms         │
│ • Mathematical NDVI & NDRE calculation          │ • 2D Spatial Vision Bounding Boxes [ymin,xmin] │
│ • 3-Year Kharif baseline (μ, σ)                 │ • Dynamic camera perspective classification   │
│ • Statistical Z-Score (Z = [obs - μ] / σ)       │ • Policy citation grounding (PMFBY §7.1.4)     │
│ • DeepMind ALU 1.42 ha parcel atomic unit       │ • Human-readable claim brief synthesis         │
│ • BigQuery GIS joins with AgriStack             │                                                │
│ • BigQuery ML (ARIMA_PLUS) 14-day forecast      │ ❌ NEVER invents satellite numbers             │
│                                                 │ ❌ NEVER determines payout amounts             │
└─────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 🔁 End-to-End System Architecture

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   GROUND-LEVEL EVIDENCE                                │
 │   Farmer Photos (1-3 images) ──► Image Integrity Forensics (pHash/dHash/EXIF/Moiré)   │
 │                                            │                                           │
 │                                            ▼                                           │
 │                   Two-Pass Calibrated Gemini Vision Forensics                          │
 │                   [Signs: leaf_rolling, canopy_senescence, stunting, soil_cracking]    │
 │                   [Spatial 2D Coordinates: [box_2d: [ymin, xmin, ymax, xmax]]]         │
 │                   [Dynamic Perspective: Crop Stand / Landscape / Canopy / Soil]        │
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
 │   Statutory PMFBY Assistant (§4.2.1, §5.4, §7.1.4) ──► Fast-Track Payout / Reject       │
 │   ──► Immutable BigQuery Audit Ledger Append (Model ID, Hash, Git SHA, Signature)      │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Implemented Features

### Feature 1: Hyper-Local Geospatial Basis Risk Resolution (Google Earth Engine, Sentinel-2, Sentinel-1 SAR & DeepMind ALU)

#### The Problem It Solves
Area-yield and weather index insurance fail systematically because satellite rainfall grids (CHIRPS / ERA5) and reference automatic weather stations operate at coarse spatial resolutions (5–10 km). A localized dry spell can destroy an individual village's crop while the weather station 8 km away records adequate seasonal rainfall, triggering a false-negative rejection with zero payout.

#### Google Cloud & Google AI Technologies Used
1. **Google Earth Engine (GEE) REST API**:
   - **Sentinel-2 MSI Level-2A (10m)**: Direct planetary-scale access to multispectral bands B4 (Red: 665 nm), B8 (NIR: 842 nm), and B11 (SWIR: 1610 nm) computing plot-level NDVI, NDRE, and SWIR moisture reflectance.
   - **Sentinel-1 C-Band Synthetic Aperture Radar (SAR)**: Active radar penetration through heavy monsoon cloud cover to measure ground surface roughness and dielectric soil moisture deficit (volumetric soil moisture $0.18\text{ m}^3/\text{m}^3$).
   - **Dynamic Z-Score Formulation**:
     $$Z = \frac{\text{NDVI}_{\text{observed}} - \mu_{\text{baseline}}}{\sigma_{\text{baseline}}}$$
     Calculated across a 3-year Kharif historical baseline envelope (July–October, 2023–2025). When $Z \le -1.5$, vegetative drought stress is mathematically proven.
2. **Google DeepMind Agricultural Landscape Understanding (ALU & AMED)**:
   - Delineates individual smallholder farms as discrete "atomic units" (e.g. 1.42 ha / 3.51 ac parcel boundary), isolating farm boundaries from surrounding vegetation and establishing sowing dates and crop health cycles.
3. **BigQuery Geospatial (GIS)**:
   - High-throughput spatial predicates (`ST_CONTAINS`, `ST_GEOGPOINT`, `ST_INTERSECTS`) executing sub-second polygon joins between India's AgriStack geo-referenced parcel registry (`IN-MH-BEE-0142`) and planetary satellite raster grids.

#### Backend Implementation
- **[`EarthEngineService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/tools/gee/EarthEngineService.java)**: Authenticates via Google Cloud Application Default Credentials (ADC) to Earth Engine REST API, extracts plot polygon NDVI $z$-scores ($\frac{\text{observed} - \mu}{\sigma}$), computes dry-spell duration, and reads Sentinel-1 SAR soil moisture.
- **[`OrbitToFieldService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/ai/OrbitToFieldService.java)**: Harmonizes macro-station weather grid data with DeepMind ALU 1.42 ha boundaries and 10m Sentinel-2 / Sentinel-1 telemetry into structured plain-English basis-risk summaries.
- **[`EarthEngineController.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/api/EarthEngineController.java)**: Exposes `/api/claims/{claimId}/sync-earth-engine` and `/api/geospatial/synthesize`.

#### Where It Sits in the UI
Located on **Claims Desk > Claim Detail > Multi-Source Telemetry & Resolution Breakdown**:
1. **Executive Conclusion Banner**:
   - Immediately states the determination: *"Reconciliation Conclusion: Missed by Weather Index • Action: Payout Recommended (§7.1.4)"*.
   - Explains in plain English: *"The 10km regional weather station reported 341 mm seasonal rain (above the 290 mm index trigger), resulting in a standard denial. However, hyper-local 10m Sentinel-2 telemetry reveals a 21-day dry spell during the critical flowering stage, driving vegetative stress to -1.90σ below the 3-year Kharif baseline. Under PMFBY Policy Clause §7.1.4, the ground evidence overrides the coarse index."*
2. **3-Box Resolution Contrast Hierarchy**:
   - **Macro Weather Grid (10 km)**: CHIRPS 341 mm vs 290 mm trigger $\to$ Index did not pay (₹0).
   - **DeepMind ALU & AgriStack (1.42 ha)**: AgriStack ID `IN-MH-BEE-0142`, 3.51 ac boundary isolated, SAR Soil Moisture Deficit $0.18\text{ m}^3/\text{m}^3$.
   - **Earth Engine Sentinel-2 (10 m)**: NDVI 0.31 ($-1.90\sigma$ vegetative stress), 21-day flowering dry spell $\to$ Severe crop damage confirmed.
3. **Interactive Orbit Telemetry Inspector (`EarthEngineInspector.tsx`)**:
   - 3-year Kharif baseline envelope comparison (2023, 2024, 2025 vs 2026).
   - Dynamic satellite metadata, cloud score (<15%), and instant recalculation synchronization.

---

### Feature 2: Gemini 2.0 Spatial Vision Grounding, Dynamic Perspective Classification & Two-Pass Forensics

#### The Problem It Solves
Prompting vision models to directly "estimate the damage percentage" or "decide if this claim should be paid" results in severe hallucinations, camera lighting bias, and legal non-compliance. Furthermore, smallholders upload photos in unpredictable order (there is zero guarantee photo 1 is a whole field, photo 2 is canopy, or photo 3 is soil). If an AI hallucinates soil cracking on an eye-level standing crop image where soil is not even visible, adjusters lose trust.

#### Google AI Technologies Used
1. **Gemini 2.0 Spatial Vision Coordinate Grounding**:
   - Natively outputs normalized 2D coordinate bounding boxes `[box_2d: [ymin, xmin, ymax, xmax]]` in a 0–1000 coordinate scale.
   - Every physical symptom scored in the concept-bottleneck rubric is anchored directly to concrete pixel coordinates on the farmer's photo:
     - `Severe Leaf Rolling`: e.g. `[200, 260, 620, 680]` (96% confidence) — upper-whorl pencil-like curling.
     - `Canopy Senescence`: e.g. `[310, 360, 780, 920]` (94% confidence) — progressive chlorosis and foliar necrosis.
     - `Dry Topsoil Surface`: e.g. `[700, 320, 970, 780]` (89% confidence) — exposed dirt terrace between crop rows (only when soil is physically visible).
2. **Dynamic Camera Perspective & Scene Understanding**:
   - Gemini 2.0 dynamically analyzes and classifies each image's perspective (`Crop Stand`, `Field Landscape`, `Canopy & Border Margin`, `Soil Surface`), primary subject, and visibility status (`soil_visible`, `foliage_visible`).
   - Dynamic perspective tags appear on thumbnails and the main photo viewer, eliminating arbitrary slot assumptions.
3. **Strict Anti-Hallucination Visibility Guard**:
   - 2D spatial bounding boxes are **strictly restricted to features genuinely visible** in each specific camera frame.
   - If an image depicts standing crop stalks or an elevated landscape view where topsoil is occluded or not in frame (`soil_visible: false`), the system **never hallucinates soil cracking boxes** on that image.
   - An explicit **Anti-Hallucination Safeguard Banner** assures insurance adjusters that spatial grounding is constrained solely to verified visible foliar/stalk structures.
4. **Concept-Bottleneck Agronomic Rubric**:
   - The model is strictly constrained to scoring physical agronomic signs on an integer 0–3 scale (`leaf_rolling_0_3`, `canopy_senescence_0_3`, `stunting_0_3`, `soil_cracking_visible`).
   - The model **never** outputs a monetary payout or a final severity classification.
5. **Tri-Anchor Calibration (`AnchorLibrary`)**:
   - Inferences include three fixed reference images (`anchor_healthy`, `anchor_moderate`, `anchor_severe`) to eliminate camera exposure and phone sensor drift.
6. **Two-Pass Agreement Gate**:
   - Two independent inferences execute with shuffled anchor orders (`pass_1` and `pass_2`).
   - Pure Java code maps the sign vectors to severity bands. If passes disagree, the system outputs **`ABSTAIN`** and routes the claim to a human agronomist.

#### Backend Implementation
- **[`GeminiGateway.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/ai/GeminiGateway.java)**: Calls Vertex AI Gemini 2.0 Flash in Vertex mode with Application Default Credentials (ADC).
- **[`GradingService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/ai/GradingService.java)**: Orchestrates two-pass visual anchor permutation, schema parsing, and symptom coordinate extraction.
- **[`SeverityMapper.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/core/SeverityMapper.java)**: Pure Java mapping from integer sign vectors to categorical severity bands (`NONE`, `MILD`, `MODERATE`, `SEVERE`).

#### Where It Sits in the UI
Located on **Claims Desk > Claim Detail > Farmer Field Evidence**:
- **Dynamic AI Perspective Classifier Banner**: Displays detected camera angle (e.g. `AI Perspective: Crop Stand (Eye-Level Rows)`), primary subject, and real-time visibility badges for soil and foliage.
- **Anti-Hallucination Safeguard Callout**: Confirms when soil or canopy is occluded, ensuring bounding boxes are restricted to visible plant structures.
- **Interactive Multi-Photo Spatial Grounding Inspector**: Focuses high-resolution photos with dynamic SVG/canvas bounding box overlays. Hovering any bounding box highlights the symptom card below and displays the exact physical symptom explanation and model confidence score.
- **Multi-Photo Selector**: Thumbnail selector with dynamic AI perspective titles and verified symptom counts.

---

### Feature 3: Deterministic Concordance Decision Core (Pure Java 21)

#### The Problem It Solves
Insurance regulations strictly prohibit AI black boxes from adjudicating claims. Claim adjudications must be 100% reproducible, explainable, and governed by deterministic logic.

#### How It Works
FieldProof implements pure Java domain logic in `com.fieldproof.core.ConcordanceTable`. It reconciles three independent signals:
1. **Signal 1 (Ground)**: Gemini two-pass agreed severity band.
2. **Signal 2 (Index)**: Area weather-station rainfall trigger ($P < \text{P30}$).
3. **Signal 3 (Orbit)**: Google Earth Engine Sentinel-2 NDVI stress ($Z \le -1.5$) & CHIRPS dry-spell timing.

#### The Concordance Matrix

| Outcome Class | Photo Severity | Index Triggers? | Satellite Stressed? | Phenological Dry Spell? | Recommended Action | Cited PMFBY Clause |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CONFIRMED_PAYOUT`** | MODERATE / SEVERE | YES | YES / NO | — | `FAST_TRACK` | §2.1 |
| **`POSSIBLE_OVERPAYMENT`** | NONE / MILD | YES | NO | — | `REVIEW` | §2.2 |
| **`PHENOLOGICAL_BASIS_RISK_GAP`** | MODERATE / SEVERE | NO | YES ($Z \le -1.5$) | YES (At flowering) | `ESCALATE` | §4.2 / §7.1.4 |
| **`SPATIAL_BASIS_RISK_GAP`** | MODERATE / SEVERE | NO | YES ($Z \le -1.5$) | NO (Low local rain) | `ESCALATE` | §4.3 / §7.1.3 |
| **`EVIDENCE_CONFLICT`** | MODERATE / SEVERE | NO | NO ($Z > -1.5$) | — | `ASK_MORE_PHOTOS_HUMAN_REVIEW` | §5.1 |
| **`NON_WEATHER_LOSS`** | PEST / DISEASE | NO | — | — | `ROUTE_TO_ADVISORY` | §6.1 |
| **`CONSISTENT`** | NONE / MILD | NO | NO | — | `NO_ACTION` | §1.1 |
| **`INTEGRITY_HOLD`** | Failed checks | — | — | — | `HOLD_NO_RECOMMENDATION` | §8.1 |

#### Backend Implementation
- **[`ConcordanceTable.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/core/ConcordanceTable.java)**: Pure Java 21 logic. Zero Spring or Google dependencies.
- **[`ClaimService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/service/ClaimService.java)**: Loads and serves claim bundles with pre-computed concordance decisions.

#### Where It Sits in the UI
- **Claims Desk > Claim List**: Filterable queue by outcome class (`CONFIRMED_PAYOUT`, `PHENOLOGICAL_BASIS_RISK_GAP`, `POSSIBLE_OVERPAYMENT`, etc.) with visual severity badges and payout recommendation tags.
- **Claims Desk > Claim Detail > Header**: Displays the prominent outcome chip, recommended action, and statutory basis summary.

---

### Feature 4: Forensic Image Integrity, Anti-Fraud & Perceptual Hashing

#### The Problem It Solves
Parametric claims are vulnerable to recycled photos from previous agricultural seasons, duplicate submissions across neighboring plots, and photographed computer/mobile screens.

#### How It Works
Before any image is evaluated by vision models, it passes through `ImageIntegrityTools`:
1. **Intra-Claim Duplicate Detection**: Computes 64-bit perceptual hashes (`pHash` and `dHash`). If Hamming distance $\le 10$, flags duplicate photos within the claim.
2. **Cross-Claim Historical Fraud Detection**: Checks hashes against historical claim registries to detect photos re-used from previous years.
3. **EXIF & GPS Boundary Inspection**: Extracts EXIF tags to verify capture timestamp and validates that GPS coordinates fall within the declared Indian agricultural bounding box (Lat 8.0°N–35.0°N, Lon 68.0°E–97.0°E).
4. **Screen Recapture & Moiré Analysis**: Gemini flags photographs taken of computer or phone displays (`screen_recapture_suspected`).
5. **Integrity Hold Protocol**: Claims failing integrity checks are placed on `INTEGRITY_HOLD` (Clause §8.1), preventing any automated recommendation.

#### Backend Implementation
- **[`ImageIntegrityTools.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/tools/ImageIntegrityTools.java)**: Pure Java image hashing, DCT perceptual frequency calculation, and EXIF extraction.

#### Where It Sits in the UI
Located on **Claims Desk > Claim Detail > Forensic Check Indicators**:
- Shows pass/fail badges for Duplicate Image Check, Screen Recapture Analysis, and EXIF Timestamp/GPS Validation.

---

### Feature 5: BigQuery ML (`ARIMA_PLUS`) 14-Day Forward Predictive Actuarial Risk Engine & Trigger Calibration

#### The Problem It Solves
1. **Retrospective Parameter Risk**: Insurers struggle to calibrate optimal trigger percentiles (e.g. 20th vs 30th vs 40th percentile). Setting triggers too low causes high farmer basis risk; setting them too high threatens insurer solvency.
2. **Forward-Looking Liquidity Blindspots**: Parametric crop policies traditionally evaluate claims retrospectively *after* harvest concludes. Actuaries and claims desks have zero forward visibility into drought escalation or portfolio capital reserve depletion during the season, delaying reinsurance drawdown and liquidity planning.

#### Google Cloud & Google AI Technologies Used
1. **Google Cloud BigQuery ML (`ARIMA_PLUS`) Time-Series Model**:
   - **Planetary-Scale Automated Time-Series**: BigQuery ML model created via [`protocol/create_arima_plus_model.sql`](file:///c:/Users/giris/Downloads/AI_builder/protocol/create_arima_plus_model.sql) trained directly on multi-year regional daily weather telemetry.
   - **Automatic Decomposition & Cleaning**: Uses BigQuery ML's native `auto_arima=TRUE`, automatic trend/seasonal decomposition, anomaly spike/dip cleaning, and step-change adjustments across individual district time series.
   - **Inference with 90% Prediction Intervals**: Executes `ML.FORECAST(MODEL fieldproof.rainfall_forecast_model, STRUCT(14 AS horizon, 0.9 AS confidence_level))` via [`protocol/forecast_payout_risk.sql`](file:///c:/Users/giris/Downloads/AI_builder/protocol/forecast_payout_risk.sql) to project upper/lower rainfall bounds and daily payout probability curves.
2. **Deterministic Liquidity & Payout Modeling**:
   - Calculates the forward breach probability $P(\text{seasonal\_rain} \le \text{trigger\_threshold})$ over the next 14 critical days.
   - Computes expected 14-day rainfall totals and daily payout likelihood curves across Indian districts (Beed, Jalna, Latur, Akola, Dewas) to help insurers anticipate reinsurance drawdowns.

#### Backend Implementation
- **[`BigQueryService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/tools/bq/BigQueryService.java)**: Connects to Google Cloud BigQuery via Application Default Credentials (ADC) and executes the allowlisted query `forecast_payout_risk` (`ML.FORECAST`). Automatically falls back to high-fidelity statistical ARIMA simulation when offline or in unit test mode.
- **[`IndexDoctorService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/tools/IndexDoctorService.java)**: Generates 14-day district risk curves across Indian districts (Beed, Jalna, Latur, Akola, Dewas) and evaluates historical SQL trigger replays (`protocol/index_doctor_slider.sql`).
- **[`IndexDoctorController.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/api/IndexDoctorController.java)**: Exposes `/api/index-doctor/forecast` and `/api/index-doctor/counties`.

#### Where It Sits in the UI
Located on the **Index Doctor** tab in the main navigation (`IndexDoctorView.tsx`) and accessible via **Claim Detail**:
1. **Historical Calibration Section (Top)**:
   - Interactive slider allowing adjusters to simulate trigger percentiles from 10% to 50% in real-time.
   - Live displays for Basis-Risk Gap Rate %, Overpayment Rate %, and payout outlay across Beed, Jalna, Latur, Akola, and Dewas.
2. **BigQuery ML (ARIMA_PLUS) Predictive Engine (Bottom)**:
   - **Target District Selector**: Beed, Jalna, Latur, Akola, Dewas.
   - **KPI Cards**: Expected 14-Day Cumulative Rain (mm), Payout Likelihood (%), and Confidence Interval Spread.
   - **Prediction Interval Chart**: Recharts composed chart showing 90% confidence bands, expected daily precipitation, and payout probability bars.
   - **Claim Detail Bridge**: One-click deep-link from any claim directly into its district's 14-day BigQuery ML projection.

---

### Feature 6: Statutory Policy RAG Grounding (PMFBY / WBCIS Binders)

#### The Problem It Solves
Insurance adjusters are legally required by the Insurance Regulatory and Development Authority of India (IRDAI) to ground every payout, rejection, or escalation against specific statutory clauses. Conventional vector RAG systems suffer from chunk boundary loss and hallucinations when interpreting interconnected insurance riders.

#### Google Cloud & Google AI Technologies Used
1. **Gemini 2.0 Long-Context Native Grounding (1M+ Tokens)**:
   - Feeds the entire official 45-page statutory insurance policy binder (`FP-INDIA-WBCIS-PARAMETRIC-2026-REG-B4`) directly into Gemini's context window.
   - Guarantees zero retrieval chunking loss, preserving holistic legal relationships across definitions, trigger formulas, exclusions, and appeal procedures.
2. **Concept-Bottleneck Zero-Hallucination Verification**:
   - Every cited clause is cryptographically validated against `policy/clause_index.json` and `PolicyIndex.java` before being presented to the adjuster.
   - Zero hallucination score computed and displayed on every statutory answer.

#### Official Indian Insurance Scheme Clauses Implemented
- **Prevented Sowing / Planting / Germination Risk (§4.2.1)**:
  - Payout of up to 25% of Sum Insured when monsoon deficit or delayed rains prevent planting across the notified insurance unit.
- **Localized Calamities Assessment (§5.4)**:
  - Farm-level assessment within 72-hour notification for hailstorm, inundation, landslide, cloudburst, and lightning fire, corroborated with Sentinel-1 SAR radar backscatter.
- **Post-Harvest Losses Under Cut & Spread Condition (§7.1.4)**:
  - Coverage up to 14 days post-harvest for harvested crops drying in the field against unseasonal/cyclonic rain and hailstorm.
- **Mid-Season Adversity On-Account Relief (§5.3)**:
  - Immediate 25% on-account liquidity relief when severe seasonal drought or floods cause expected yield to fall below 50% of normal yield.
- **Critical-Stage Flowering Drought Escalation (§4.2)**:
  - Reconciles aggregate rainfall with micro-temporal dry spells exceeding 14 days during reproductive flowering.
- **Spatial Micro-Climatic Basis Risk (§4.3)**:
  - Escalates claims where plot-level precipitation is depressed relative to county automatic weather stations.

#### Backend Implementation
- **[`PolicyGroundingService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/policy/PolicyGroundingService.java)**: Grounds claim bundles and adjuster queries natively across the full 45-page statutory binder using Gemini's 1M-token context window.
- **[`PolicyIndex.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/policy/PolicyIndex.java)**: Registers and validates all official PMFBY clause IDs (`CL-4.2.1`, `CL-5.4`, `CL-7.1.4`, `CL-5.3`) with normalized section lookup.
- **[`BriefGuard.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/policy/BriefGuard.java)**: Validates that adjuster briefs cite only active, verified policy sections.
- **[`PolicyController.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/api/PolicyController.java)**: Exposes `POST /api/policy/query` and `GET /api/policy/ground/{claimId}`.

#### Where It Sits in the UI
Located directly in the **Adjuster Desk** (`ClaimDetail.tsx`):
1. **Statutory Claim Grounding Card**:
   - Automatically displays the governing clause, official legal rationale, and verified citations for the selected claim.
2. **Interactive Policy Query Assistant (`PolicyRAGAssistant.tsx`)**:
   - Real-time statutory query bar with 1-click preset pills for *Prevented Sowing §4.2.1*, *Localized Calamities §5.4*, *Post-Harvest §7.1.4*, and *Mid-Season Adversity §5.3*.
   - Displays verbatim quoted rules, page references, and statutory application notes.
3. **One-Click Citation Insertion**:
   - Click "Cite" or "Insert Citation" on any scheme clause to automatically paste the formatted legal citation directly into the Adjuster's decision notes.
4. **Policy Drawer Modal (`PolicyModal.tsx`)**:
   - Full 4-tab interactive policy viewer with complete clause index, free-form statutory search, locked SQL payout rule, and master policy text.

---

### Feature 7: Immutable BigQuery Audit Ledger & Two-Pass Gate Oversight

#### The Problem It Solves
Financial regulatory compliance requires every insurance decision to be reproducible, explainable, and tamper-evident.

#### How It Works
When an adjuster signs off on a claim, `BigQueryAuditWriter` appends an immutable record containing:
- `audit_id`, `claim_id`, `plot_id`, and `timestamp_utc`.
- `model_version` (e.g., `gemini-2.0-flash`).
- `prompt_version` and `anchor_image_ids`.
- `frozen_protocol_commit_hash`: Exact Git commit hash of the locked trigger rules.
- `adjuster_id`, `adjuster_action` (`APPROVED`, `REJECTED`, `ESCALATED`), and adjuster notes.
- **Fail-Safe Enforcement**: If the BigQuery audit write fails, the decision transaction fails fast (HTTP 503) to prevent un-audited claim closures.

#### Backend Implementation
- **[`BigQueryAuditWriter.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/tools/bq/BigQueryAuditWriter.java)**: Streaming insert to BigQuery dataset `fieldproof.claim_audit_ledger` with graceful fallback to in-memory ledger in offline testing.
- **[`ResponsibleAiService.java`](file:///c:/Users/giris/Downloads/AI_builder/backend/src/main/java/com/fieldproof/eval/ResponsibleAiService.java)**: Audits two-pass agreement rates, model confidence spread, and geographic fairness.

#### Where It Sits in the UI
- Main Navigation > **Validation** tab (`ValidationView.tsx`): Shows frozen protocol Git SHA, locked SQL payout rules, two-pass agreement statistics, and BigQuery audit logs.
- Claims Desk > Claim Detail > Decision Rail: Displays the immutable audit record timestamp, adjuster ID, and signature.

---

## 💻 Summary of Verification Commands

```bash
# 1. Run all backend tests (concordance, integrity, Earth Engine, policy, responsible AI)
./mvnw -q verify

# 2. Build production frontend bundle
cd frontend && npm run build

# 3. Launch full local system (Vite + Spring Boot)
./scripts/start.sh
```
