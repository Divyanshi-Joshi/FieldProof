-- ==============================================================================
-- FieldProof Frozen Trigger Evaluation Query
-- Protocol Version: October 16, 2026 (Pre-Evaluation Baseline)
-- Table Target: fieldproof.plot_evidence
-- Output Contract: EvidenceRecord (contracts/EvidenceRecord.schema.json)
-- ==============================================================================
-- This query deterministically calculates the three frozen decision signals:
--   1. index_pays: season_rain_mm < trigger_rain_mm (strictly below 30th percentile)
--   2. satellite_stress: ndvi_anomaly_z < -1.0 (strictly below -1.0 std dev)
--   3. dry_spell_overlaps_critical_stage: intersection of dry spell and critical growth stage
--
-- No post-hoc modifications to these rules are permitted during test evaluation.
-- ==============================================================================

WITH base_evidence AS (
  SELECT
    plot_id,
    county,
    season,
    crop,
    
    -- Critical growth stage locked per crop (defaulting to 'flowering' for maize)
    COALESCE(critical_growth_stage, 'flowering') AS critical_growth_stage,
    
    -- Rainfall totals and thresholds (mm)
    CAST(season_rain_mm AS FLOAT64) AS season_rain_mm,
    CAST(trigger_rain_mm AS FLOAT64) AS trigger_rain_mm,
    CAST(30 AS INT64) AS trigger_percentile,
    
    -- Median seasonal rain (50th percentile) used to verify local spatial deficit
    CAST(COALESCE(median_rain_mm, trigger_rain_mm * 1.35) AS FLOAT64) AS median_rain_mm,
    
    -- Dry spell phenology
    CAST(max_dry_spell_days AS INT64) AS max_dry_spell_days,
    CAST(dry_spell_window_start AS DATE) AS dry_spell_window_start,
    CAST(dry_spell_window_end AS DATE) AS dry_spell_window_end,
    
    -- Critical growth-stage window dates
    CAST(critical_stage_window_start AS DATE) AS critical_stage_window_start,
    CAST(critical_stage_window_end AS DATE) AS critical_stage_window_end,
    
    -- Sentinel-2 vegetation anomaly data
    CAST(ndvi_observed AS FLOAT64) AS ndvi_observed,
    CAST(ndvi_baseline_mean AS FLOAT64) AS ndvi_baseline_mean,
    
    -- Compute or take existing z-score
    CAST(
      COALESCE(
        ndvi_anomaly_z,
        SAFE_DIVIDE(ndvi_observed - ndvi_baseline_mean, ndvi_baseline_std)
      ) AS FLOAT64
    ) AS ndvi_anomaly_z,
    
    -- Frozen satellite stress threshold fixed at -1.0 std dev
    CAST(-1.0 AS FLOAT64) AS ndvi_stress_cutoff_z,
    
    -- Metadata & provenance
    COALESCE(evidence_source, 'BIGQUERY_DATASET') AS evidence_source,
    COALESCE(evidence_timestamp_utc, CURRENT_TIMESTAMP()) AS evidence_timestamp_utc
  FROM
    `fieldproof.plot_evidence`
)

SELECT
  plot_id,
  county,
  season,
  crop,
  critical_growth_stage,

  -- 1. Seasonal Rainfall & Index Payout Rule
  season_rain_mm,
  trigger_rain_mm,
  trigger_percentile,
  
  -- Frozen Rule 1: Index pays strictly when season_rain_mm < trigger_rain_mm (30th percentile)
  (season_rain_mm < trigger_rain_mm) AS index_pays,
  
  -- Spatial Deficit: Plot-level rain is below median but at or above trigger threshold
  (season_rain_mm >= trigger_rain_mm AND season_rain_mm < median_rain_mm) AS low_local_rain,

  -- 2. Phenological Timing & Critical Growth-Stage Overlap
  max_dry_spell_days,
  dry_spell_window_start,
  dry_spell_window_end,
  
  -- Frozen Rule 3: Dry spell overlaps critical reproductive/flowering stage
  (
    dry_spell_window_start IS NOT NULL
    AND dry_spell_window_end IS NOT NULL
    AND critical_stage_window_start IS NOT NULL
    AND critical_stage_window_end IS NOT NULL
    AND dry_spell_window_start <= critical_stage_window_end
    AND dry_spell_window_end >= critical_stage_window_start
  ) AS dry_spell_overlaps_critical_stage,

  -- 3. Satellite Vegetation Anomaly & Stress Cut-Off
  ndvi_observed,
  ndvi_baseline_mean,
  ndvi_anomaly_z,
  ndvi_stress_cutoff_z,
  
  -- Frozen Rule 2: Satellite stress triggered strictly when z-score < -1.0
  (ndvi_anomaly_z < ndvi_stress_cutoff_z) AS satellite_stress,

  -- Provenance
  evidence_source,
  evidence_timestamp_utc

FROM
  base_evidence;
