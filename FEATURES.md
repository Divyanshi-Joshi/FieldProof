# 🛰️ FieldProof — Core Features & Architectural Guide

FieldProof is an automated, AI-assisted reconciliation layer for parametric index crop insurance. It bridges the gap between conventional macro-level weather indices and farmer-level ground reality.

> **Foundational Principle:**  
> *"Gemini perceives and explains; Google Earth Engine independently verifies; deterministic Java decides; a human adjuster signs off."*

---

## Architecture: The "Orbit-to-Field" Decision Engine

FieldProof solves the fatal flaw of index insurance—**basis risk** (when an insurance index fails to pay a farmer who suffered real crop loss, or pays a farmer who suffered no loss).

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   GROUND-LEVEL EVIDENCE                                │
 │   Farmer Photos (1-3 images) ──► Image Integrity Forensics (pHash/dHash/EXIF/Moiré)   │
 │                                            │                                           │
 │                                            ▼                                           │
 │                   Two-Pass Calibrated Gemini 3 Vision Forensics                        │
 │                   [Signs: leaf_rolling, canopy_senescence, stunting, soil_cracking]    │
 └────────────────────────────────────────────┬───────────────────────────────────────────┘
                                              │
                                              ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   ORBIT-LEVEL EVIDENCE                                 │
 │   Farmer Plot Centroid / GPS Polygon (e.g., Lat: -1.8021, Lon: 37.6253)                │
 │                                            │                                           │
 │                                            ▼                                           │
 │                       Google Earth Engine & Vertex Geospatial                          │
 │      • Optical: COPERNICUS/S2_SR_HARMONIZED (Sentinel-2 L2A 10m Reflectance)           │
 │      • Rainfall: UCSB-CHG/CHIRPS/DAILY (0.05° High-Resolution Precipitation)            │
 │      • 3-Year Historical Baseline (2023–2025 Harmonic Seasonal Mean μ & Std Dev σ)     │
 │      • On-the-fly Dynamic NDVI Anomaly Z-Score & Moisture Deficit %                    │
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

## Feature 1: Orbit-to-Field (Google Earth Engine & Vertex Geospatial)

### The Problem It Solves
Traditional parametric insurance uses area-yield or weather-station aggregate rainfall. If a weather station recorded 341 mm of rain over a 4-month season (above the 290 mm payout trigger), the automated system rejects the claim. However, if a 21-day dry spell struck right during **flowering**, the crop was permanently scorched and yielded zero grain. 

### How It Works
Google Earth Engine connects orbit-level satellite data dynamically to the farmer's GPS coordinates:
1. **Sentinel-2 Multi-Spectral Surface Reflectance (`COPERNICUS/S2_SR_HARMONIZED`)**:
   - Uses Band 8 (Near-Infrared: 842 nm) and Band 4 (Red: 665 nm) at 10m ground resolution.
   - Computes Normalized Difference Vegetation Index:
     $$\text{NDVI} = \frac{\text{B8} - \text{B4}}{\text{B8} + \text{B4}}$$
   - Filters clouds via Sentinel-2's Scene Classification Layer (`SCL`).
2. **3-Year Multi-Temporal Historical Baseline**:
   - For the exact same seasonal calendar window (March 15 to June 30), GEE pulls the 2023, 2024, and 2025 seasons.
   - Computes baseline mean $\mu_{\text{baseline}}$ and standard deviation $\sigma_{\text{baseline}}$.
3. **Dynamic Z-Score Formulation**:
   $$Z = \frac{\text{NDVI}_{\text{observed}} - \mu_{\text{baseline}}}{\sigma_{\text{baseline}}}$$
   If $Z \le -1.5$, the plot exhibits verified vegetative drought stress.
4. **CHIRPS Daily Precipitation (`UCSB-CHG/CHIRPS/DAILY`)**:
   - Evaluates 0.05° (~5 km) daily pentad precipitation records.
   - Measures consecutive dry days ($< 2.5\text{ mm}$ rain).
   - Computes moisture deficit % against the 3-year historical average:
     $$\text{Moisture Deficit \%} = \max\left(0, \frac{P_{\text{hist}} - P_{\text{current}}}{P_{\text{hist}}} \times 100\right)$$

### Where It's Seen in the UI
- **Claim Detail > Satellite Card**: Shows the dynamic Z-score ($Z = -1.90$) and a `GEE Orbit` badge.
- **Orbit Deep-Dive Modal**:
  - Displays Sentinel-2 tile metadata, cloud-mask percentage, and plot GPS centroid.
  - Interactive **3-Year Historical Trajectory**: Visual comparison bars comparing 2023, 2024, 2025 against the 2026 observed drop.
  - **⚡ Sync Orbit Data with Claim**: Button that triggers on-the-fly re-computation, refreshes the claim evidence in the database, and re-evaluates the concordance decision instantly.

---

## Feature 2: Calibrated Zero-Hallucination Gemini Vision Forensics

### The Problem It Solves
Directly prompting an LLM to "estimate the damage percentage" or "decide if this claim should be paid" results in severe hallucinations, camera lighting bias, and legal non-compliance.

### How It Works
1. **Concept-Bottleneck Rubric**: Gemini is constrained to scoring only four concrete, physical agronomic signs on an integer 0–3 scale:
   - `leaf_rolling_0_3`: Degree of longitudinal leaf curling (0 = flat, 3 = tightly rolled pencil-like tubes).
   - `canopy_senescence_0_3`: Fraction of canopy exhibiting yellowing/necrosis (0 = green, 3 = complete brownout).
   - `stunting_0_3`: Stand height deficit relative to standard crop growth stage.
   - `soil_cracking_visible`: Boolean detection of polygonal dry soil fissures.
2. **Tri-Anchor Calibration (`AnchorLibrary`)**:
   - Every Gemini call includes three fixed reference images:
     - `anchor_healthy` (Score: 0)
     - `anchor_moderate` (Score: 2)
     - `anchor_severe` (Score: 3)
   - These anchors eliminate prompt drift caused by camera hardware, exposure, or cloud shadows.
3. **Two-Pass Agreement Gate**:
   - Two independent Gemini inferences are executed with shuffled anchor ordering (`pass_1` and `pass_2`).
   - Pure Java code maps the signs vector to a severity band (`NONE`, `MILD`, `MODERATE`, `SEVERE`).
   - If `pass_1_band != pass_2_band`, the system refuses to guess and outputs **`ABSTAIN`**, routing the claim to a human agronomist.

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
  - **Payout Frequency & Projected Outlay ($ USD)** across individual counties.

---

## Feature 6: Policy Agent & Multilingual Farmer Messenger

### The Problem It Solves
Adjusters require legally defensible policy citations, while smallholder farmers need transparent, jargon-free explanations in their native language.

### How It Works
1. **PolicyIndex & BriefGuard**:
   - Strict allowlist of policy clauses loaded from `policy/clauses.json`.
   - Validates that adjuster briefs cite only legitimate, active policy sections.
2. **Farmer Message Localization**:
   - Generates farmer-facing text in **English (`en`)**, **Hindi (`hi`)**, and **Swahili (`sw`)**.
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
