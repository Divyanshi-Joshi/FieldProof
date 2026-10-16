# FieldProof: Frozen Trigger Protocol (Pre-Evaluation Baseline)

**Status:** FROZEN & LOCKED  
**Date of Ratification:** October 16, 2026  
**Scope:** AI Builder Cup 2026 (BFSI Track) — FieldProof Decision System  
**Git Binding:** Committed to version control prior to evaluating or scoring any test images. The resulting Git commit hash is recorded in every BigQuery audit record (`AuditRecord.frozen_protocol_commit_hash`).

---

## 1. Purpose & Non-Circularity Guarantee

In parametric weather-index insurance, a severe vulnerability is **threshold circularity** (post-hoc tuning of trigger percentiles or anomaly cut-offs after observing test set loss outcomes). Such tuning creates pseudo-precision, inflates apparent accuracy, and masks real basis risk.

To preserve scientific and regulatory integrity:
1. **Pre-Evaluation Lock:** All rules, percentiles, stress z-score cut-offs, phenological overlap logic, and sign-to-severity mappings defined in this document are frozen prior to running inference or evaluation on the test image bundle.
2. **No Post-Hoc Adjustments:** No threshold changes, weight recalibrations, or percentile shifts are permitted once test results are observed.
3. **Audit Trail:** Every claim reconciliation evaluated by the Concordance Agent references the immutable Git commit SHA of this protocol.

---

## 2. Rule 1: Index Trigger Rule (`index_pays`)

The parametric weather index triggers an automatic payout if and only if cumulative seasonal precipitation at the insured plot falls strictly below the 30th percentile threshold of long-term historical rainfall for that specific geography and seasonal window.

### 2.1 Formal Logic
```text
index_pays = (season_rain_mm < trigger_rain_mm)
```

Where:
- `season_rain_mm`: Cumulative rainfall measured or reanalyzed for the plot across the contracted seasonal window (mm).
- `trigger_percentile`: Fixed strictly at **30** (30th percentile).
- `trigger_rain_mm`: Precipitation depth (mm) corresponding to the 30th percentile of the baseline distribution:
  $$\text{trigger\_rain\_mm} = \mathcal{P}_{30}(\text{Rainfall}_{\text{historical}})$$
- **Baseline Data Sources:**
  - *Primary:* ERA5 reanalysis (1991–2020 climatology, 30-year window) queried via Open-Meteo API for plot latitude/longitude.
  - *Fallback:* Multi-season county-level empirical rainfall distribution from the historical dataset when live API access is offline.

### 2.2 Local Spatial Deprivation Indicator (`low_local_rain`)
To detect spatial basis risk (where an area index does not pay, but local plot rain was depressed below the median):
```text
low_local_rain = (season_rain_mm >= trigger_rain_mm AND season_rain_mm < median_rain_mm)
```
Where `median_rain_mm` is the 50th percentile of the baseline distribution.

---

## 3. Rule 2: Satellite Stress Cut-Off (`satellite_stress`)

Vegetation condition is independently verified using Sentinel-2 MultiSpectral Instrument (MSI) seasonal Normalized Difference Vegetation Index (NDVI) anomalies against historical multi-year baselines.

### 3.1 Formal Logic
```text
satellite_stress = (ndvi_anomaly_z < -1.0)
```

Where:
- `ndvi_anomaly_z`: Normalized standard score (z-score) of the observed NDVI for the plot pixel during the contracted season:
  $$z = \frac{\text{NDVI}_{\text{observed}} - \mu_{\text{baseline}}}{\sigma_{\text{baseline}}}$$
- $\mu_{\text{baseline}}$: Multi-year historical mean NDVI for that pixel/county during the corresponding seasonal 10-day composite window.
- $\sigma_{\text{baseline}}$: Multi-year standard deviation of NDVI for that pixel/county during the corresponding window.
- `ndvi_stress_cutoff_z`: Fixed strictly at **-1.0** standard deviations.
- If $z < -1.0$, the vegetation index indicates statistically significant photosynthetic distress.

---

## 4. Rule 3: Critical Growth-Stage Dry-Spell Overlap (`dry_spell_overlaps_critical_stage`)

Seasonal rainfall totals often obscure catastrophic mid-season droughts. A plot suffers phenological drought when an unbroken dry spell coincides with the crop's most vulnerable growth stage.

### 4.1 Dry Spell Definition
- A continuous sequence of days where daily precipitation is strictly below $1.0\text{ mm}$:
  $$\text{Daily Rain} < 1.0\text{ mm}$$
- Characterized by `max_dry_spell_days`, bounded by `[dry_spell_window_start, dry_spell_window_end]`.

### 4.2 Pre-Fixed Critical Stage Windows
The critical growth stage is pre-fixed per crop before evaluation:
- **Maize:** `flowering` (tasseling/silking window, typically Days 45–75 post-planting).
- **Sorghum / Millet:** `flowering` (boot to grain filling, Days 40–65).
- **Legumes (Beans/Cowpeas):** `flowering` / `pod_setting` (Days 35–55).

### 4.3 Overlap Intersection Condition
```text
dry_spell_overlaps_critical_stage = (
    dry_spell_window_start <= critical_stage_window_end 
    AND dry_spell_window_end >= critical_stage_window_start
)
```
Where `[critical_stage_window_start, critical_stage_window_end]` is the agronomically established calendar or thermal-time window for that crop and planting date.

---

## 5. Rule 4: Photo Damage Threshold & Calibrated Rubric

Perception is probabilistic (Gemini 2.0 Flash); payout eligibility is strictly deterministic (pure Java in `core/`). The model never outputs an arbitrary loss percentage or financial decision.

### 5.1 Concept-Bottleneck Rubric
Gemini perceives and scores physical, observable signs on a bounded integer scale:
1. `leaf_rolling_0_3`: $0 = \text{none}$, $1 = \text{mild curling at midday}$, $2 = \text{permanent tightly rolled leaves}$, $3 = \text{browned/brittle pencil leaves}$.
2. `canopy_senescence_0_3`: $0 = \text{green}$, $1 = \text{lower leaves yellowing}$, $2 = \text{mid-canopy firing/necrosis}$, $3 = \text{total crop dry-down}$.
3. `stunting_0_3`: $0 = \text{normal height/stand}$, $1 = \text{mild height depression}$, $2 = \text{severe stunting/patchy stand}$, $3 = \text{total stand collapse}$.
4. `soil_cracking_visible`: Boolean flag indicating visible surface tension fractures from desiccation.

### 5.2 Deterministic Code Mapping to Severity Bands (`core/SeverityBand.java`)
Deterministic Java code maps the sign vector to a `SeverityBand`:
- **`SEVERE`**: Requires at least **two** signs scoring $\ge 2$:
  $$\sum_{s \in \{\text{leaf\_rolling}, \text{canopy\_senescence}, \text{stunting}\}} \mathbb{I}(s \ge 2) \ge 2$$
  *(Or any single sign $= 3$ accompanied by visible soil cracking).*
- **`MODERATE`**:
  - Exactly one sign $\ge 2$, OR
  - At least two signs $\ge 1$ with `soil_cracking_visible = true`, OR
  - All three signs $\ge 1$.
- **`MILD`**: Exactly one sign $\ge 1$ without soil cracking.
- **`NONE`**: All signs equal $0$ and no visible soil cracking.

### 5.3 Two-Pass Agreement Gate
To protect against anchor-order bias and vision-language hallucinations:
1. Two independent Gemini evaluation passes are executed with shuffled visual anchor sequences.
2. Bands are evaluated independently: `pass_1_band` and `pass_2_band`.
3. **Agreement Condition:**
   ```text
   passes_agreed = (pass_1_band == pass_2_band)
   ```
4. **Abstain Policy:** If `passes_agreed == false`:
   ```text
   abstain_to_human = true
   final_severity_band = 'ABSTAIN'
   ```
   The claim is immediately routed to human loss adjusters with no automated recommendation.

### 5.4 Photo-Damaged Criterion
A plot is confirmed as **photo-damaged** if and only if:
```text
passes_agreed == true 
AND final_severity_band IN ('MODERATE', 'SEVERE')
```

---

## 6. Rule 5: Simulator Payout Assumption (Index Doctor)

FieldProof's **Index Doctor** enables actuarial teams to model sensitivity and recalibrate triggers against observed basis-risk gaps.

- **Illustrative Payout Model:** A flat **$100.00 USD** payout is allocated per qualifying triggered plot for simulation purposes.
- **Regulatory & Actuarial Disclaimer:**
  > **IMPORTANT NOTICE:** The $100 USD figure is strictly an illustrative computational baseline for comparative what-if sensitivity simulations and basis-risk shortfall visualizations. It does not constitute actuarial pricing, underwriting guidance, or financial advisory. Actual policy limits, sum insured, and deductible schedules must be loaded from certified insurer policy schedules.

---

## 7. Concordance Decision Table (Three-Signal Reconciliation)

When `integrity_passed = true` and `damage_type = 'drought'`, the Concordance Agent deterministically synthesizes the three independent signals:

| Index (`index_pays`) | Photo Damaged (`MODERATE` / `SEVERE`) | Satellite (`satellite_stress`) | Phenological Overlap (`dry_spell_overlaps`) | Concordance Outcome Class | System Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TRUE** | **TRUE** | Any | Any | `CONFIRMED_PAYOUT` | `FAST_TRACK_PAYOUT` |
| **TRUE** | **FALSE** | Any | Any | `POSSIBLE_OVERPAYMENT` | `MANUAL_REVIEW` |
| **FALSE** | **TRUE** | **TRUE** | **TRUE** | `PHENOLOGICAL_BASIS_RISK_GAP` | `ESCALATE` |
| **FALSE** | **TRUE** | **TRUE** | **FALSE** (`low_local_rain` = true) | `SPATIAL_BASIS_RISK_GAP` | `ESCALATE` |
| **FALSE** | **TRUE** | **FALSE** | Any | `EVIDENCE_CONFLICT` | `REQUEST_ADDITIONAL_PHOTOS` |
| **FALSE** | **FALSE** | Any | Any | `CONSISTENT_NO_PAYOUT` | `NO_ACTION` |
| Any | Non-Drought Damage (Pest/Weed/Disease) | Any | Any | `NON_WEATHER_LOSS` | `ROUTE_TO_ADVISORY` |
| Any | Integrity Failure (`integrity_passed = false`) | Any | Any | `INTEGRITY_HOLD` | `HOLD_NO_ACTION` |

---

## 8. Summary of Protocol Constants

| Parameter | Identifier in Contract | Frozen Value | Justification |
| :--- | :--- | :--- | :--- |
| **Trigger Percentile** | `trigger_percentile` | **30** | Standard agricultural drought index trigger (bottom 30% of distribution) |
| **Rainfall Data Source** | `evidence_source` | `BIGQUERY_DATASET` / `OPEN_METEO_FALLBACK` | ERA5 1991–2020 climatology |
| **Dry Day Rainfall Cutoff** | *N/A (daily)* | **< 1.0 mm** | Standard meteorological definition of an agricultural dry day |
| **NDVI Stress Z-Score** | `ndvi_stress_cutoff_z` | **-1.0** | $1\sigma$ deviation below seasonal mean captures vegetation stress |
| **Severe Sign Threshold** | *N/A (in Java)* | $\ge 2$ signs $\ge 2$ | Prevents false positives from localized leaf curl |
| **Agreement Gate Requirement** | `passes_agreed` | **TRUE** | Dual-pass shuffled anchor consensus required to automate |
| **Simulation Unit Payout** | *N/A (Index Doctor)* | **$100.00 USD** | Fixed illustrative assumption for what-if simulations |
