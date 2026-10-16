-- ============================================================================
-- FieldProof: Index Doctor Slider — Parameterized BigQuery Query
-- ============================================================================
-- Evaluates test plots at a given trigger percentile and computes
-- payout frequency, gap rates, overpayment rates, and illustrative payouts.
--
-- Parameter: @trigger_percentile  INT64  (range: 5–60, default: 30)
-- Source:    fieldproof.plot_evidence
-- Frozen:    protocol/FROZEN_TRIGGER_PROTOCOL.md §6
-- ============================================================================

DECLARE trigger_percentile INT64 DEFAULT @trigger_percentile;

-- Step 1: Compute the trigger rainfall threshold per county+season
--         at the requested percentile of the historical distribution.
WITH county_season_thresholds AS (
  SELECT
    county,
    season,
    PERCENTILE_CONT(season_rain_mm, trigger_percentile / 100.0)
      OVER (PARTITION BY county, season) AS trigger_rain_mm,
    PERCENTILE_CONT(season_rain_mm, 0.50)
      OVER (PARTITION BY county, season) AS median_rain_mm
  FROM `fieldproof.plot_evidence`
),

-- Step 2: Deduplicate thresholds to one row per county+season.
thresholds AS (
  SELECT DISTINCT county, season, trigger_rain_mm, median_rain_mm
  FROM county_season_thresholds
),

-- Step 3: Evaluate each plot against the trigger at this percentile.
evaluated AS (
  SELECT
    p.plot_id,
    p.county,
    p.season,
    p.season_rain_mm,
    t.trigger_rain_mm,
    t.median_rain_mm,

    -- Index trigger: strictly below threshold → pays
    (p.season_rain_mm < t.trigger_rain_mm)                    AS index_pays,

    -- Low local rain: between trigger and median
    (p.season_rain_mm >= t.trigger_rain_mm
     AND p.season_rain_mm < t.median_rain_mm)                 AS low_local_rain,

    -- Photo-damaged: MODERATE or SEVERE weather damage with agreed passes
    (p.final_severity_band IN ('MODERATE', 'SEVERE')
     AND p.passes_agreed = TRUE
     AND p.damage_type = 'drought')                           AS photo_damaged,

    -- Satellite stress
    p.satellite_stress,

    -- Dry spell overlaps critical stage
    p.dry_spell_overlaps_critical_stage

  FROM `fieldproof.plot_evidence` p
  JOIN thresholds t
    ON p.county = t.county AND p.season = t.season
),

-- Step 4: Classify each plot into concordance outcome categories.
classified AS (
  SELECT
    *,
    -- Payout: index pays
    index_pays                                                  AS is_payout,

    -- Gap: index does NOT pay, but photo-damaged AND satellite-stressed
    (NOT index_pays AND photo_damaged AND satellite_stress)     AS is_gap,

    -- Phenological gap: gap where dry spell overlaps critical stage
    (NOT index_pays AND photo_damaged AND satellite_stress
     AND dry_spell_overlaps_critical_stage)                     AS is_phenological_gap,

    -- Spatial gap: gap where dry spell does NOT overlap
    (NOT index_pays AND photo_damaged AND satellite_stress
     AND NOT dry_spell_overlaps_critical_stage)                 AS is_spatial_gap,

    -- Overpayment: index pays but no photo damage
    (index_pays AND NOT photo_damaged)                          AS is_overpayment

  FROM evaluated
)

-- Step 5: Aggregate by county and season, plus overall totals.
SELECT
  county,
  season,
  COUNT(*)                                                      AS total_plots,

  -- Payout frequency
  COUNTIF(is_payout)                                            AS payout_count,
  SAFE_DIVIDE(COUNTIF(is_payout), COUNT(*))                     AS payout_frequency,

  -- Gap rate (basis-risk gaps)
  COUNTIF(is_gap)                                               AS gap_count,
  SAFE_DIVIDE(COUNTIF(is_gap), COUNT(*))                        AS gap_rate,

  -- Phenological vs spatial gap breakdown
  COUNTIF(is_phenological_gap)                                  AS phenological_gap_count,
  COUNTIF(is_spatial_gap)                                       AS spatial_gap_count,

  -- Overpayment rate
  COUNTIF(is_overpayment)                                       AS overpayment_count,
  SAFE_DIVIDE(COUNTIF(is_overpayment), COUNT(*))                AS overpayment_rate,

  -- Illustrative payout (flat $100 USD per triggered plot)
  COUNTIF(is_payout) * 100.0                                    AS illustrative_payout_usd,

  -- Trigger threshold used (for display)
  ANY_VALUE(trigger_rain_mm)                                    AS trigger_rain_mm

FROM classified
GROUP BY county, season

UNION ALL

-- Overall totals row (county = '__ALL__', season = '__ALL__')
SELECT
  '__ALL__'                                                     AS county,
  '__ALL__'                                                     AS season,
  COUNT(*)                                                      AS total_plots,
  COUNTIF(is_payout)                                            AS payout_count,
  SAFE_DIVIDE(COUNTIF(is_payout), COUNT(*))                     AS payout_frequency,
  COUNTIF(is_gap)                                               AS gap_count,
  SAFE_DIVIDE(COUNTIF(is_gap), COUNT(*))                        AS gap_rate,
  COUNTIF(is_phenological_gap)                                  AS phenological_gap_count,
  COUNTIF(is_spatial_gap)                                       AS spatial_gap_count,
  COUNTIF(is_overpayment)                                       AS overpayment_count,
  SAFE_DIVIDE(COUNTIF(is_overpayment), COUNT(*))                AS overpayment_rate,
  COUNTIF(is_payout) * 100.0                                    AS illustrative_payout_usd,
  NULL                                                          AS trigger_rain_mm
FROM classified

ORDER BY county, season;
