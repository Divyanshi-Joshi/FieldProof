/**
 * FieldProof Contract Types
 * =========================
 * Auto-generated from /contracts/*.schema.json — keep in sync.
 * Used by the React + Vite + TypeScript frontend.
 *
 * RULE: If you change a schema, regenerate this file.
 */

// ─── Shared Enums ────────────────────────────────────────────────────────────

export type SeverityBand = "NONE" | "MILD" | "MODERATE" | "SEVERE" | "ABSTAIN";

export type DamageType =
  | "drought"
  | "pest"
  | "disease"
  | "weed"
  | "nutrient"
  | "other"
  | "none";

export type GrowthStage =
  | "seedling"
  | "vegetative"
  | "flowering"
  | "grain_filling"
  | "maturity"
  | "unknown";

export type CriticalGrowthStage =
  | "seedling"
  | "vegetative"
  | "flowering"
  | "grain_filling"
  | "maturity";

export type OutcomeClass =
  | "CONFIRMED_PAYOUT"
  | "POSSIBLE_OVERPAYMENT"
  | "PHENOLOGICAL_BASIS_RISK_GAP"
  | "SPATIAL_BASIS_RISK_GAP"
  | "EVIDENCE_CONFLICT"
  | "NON_WEATHER_LOSS"
  | "CONSISTENT"
  | "INTEGRITY_HOLD"
  | "ABSTAIN";

export type RecommendedAction =
  | "FAST_TRACK"
  | "REVIEW"
  | "ESCALATE"
  | "ASK_MORE_PHOTOS_HUMAN_REVIEW"
  | "ROUTE_TO_ADVISORY"
  | "NO_ACTION"
  | "HOLD_NO_RECOMMENDATION"
  | "ABSTAIN_TO_HUMAN";

export type AdjusterAction = "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";

export type EvidenceSource = "BIGQUERY_DATASET" | "OPEN_METEO_FALLBACK" | "GOOGLE_EARTH_ENGINE";

// ─── Shared Sub-Types ────────────────────────────────────────────────────────

export interface Signs {
  /** Leaf rolling severity: 0 = none, 3 = severe */
  leaf_rolling_0_3: 0 | 1 | 2 | 3;
  /** Canopy senescence / yellowing: 0 = none, 3 = severe */
  canopy_senescence_0_3: 0 | 1 | 2 | 3;
  /** Stand stunting: 0 = none, 3 = severe */
  stunting_0_3: 0 | 1 | 2 | 3;
  /** Whether dry soil cracking is visible */
  soil_cracking_visible: boolean;
}

export interface GradingPass {
  is_crop_field: boolean;
  same_field_across_photos: boolean;
  screen_recapture_suspected: boolean;
  crop: string;
  growth_stage: GrowthStage;
  signs: Signs;
  damage_type: DamageType;
  /** 0.0 – 1.0 */
  confidence: number;
  visible_evidence: string[];
  photo_quality_flags: string[];
}

export interface FarmerMessages {
  en: string;
  hi?: string;
  sw?: string;
}

// ─── Core Contract 1: GradingResult ──────────────────────────────────────────

export interface GradingResult {
  claim_id: string;
  plot_id: string;
  /** ISO-8601 */
  uploaded_at: string;
  photo_urls: string[];

  // Integrity
  integrity_passed: boolean;
  duplicate_within_claim: boolean;
  duplicate_across_claims: boolean;
  matched_earlier_claim_id: string | null;
  /** Zero-based indices of rejected photos */
  rejected_photo_indices: number[];
  exif_timestamp_present: boolean;
  exif_gps_present: boolean;
  integrity_flags: string[];

  // Two-pass grading
  pass_1: GradingPass;
  pass_2: GradingPass;

  // Consolidated grading (derived from the agreeing pass, or pass_1 if abstaining)
  is_crop_field: boolean;
  same_field_across_photos: boolean;
  screen_recapture_suspected: boolean;
  crop: string;
  growth_stage: GrowthStage;
  signs: Signs;
  damage_type: DamageType;
  /** 0.0 – 1.0 */
  confidence: number;
  visible_evidence: string[];
  photo_quality_flags: string[];

  // Agreement gate
  pass_1_band: SeverityBand;
  pass_2_band: SeverityBand;
  passes_agreed: boolean;
  final_severity_band: SeverityBand;
  abstain_to_human: boolean;
}

// ─── Core Contract 2: EvidenceRecord ─────────────────────────────────────────

export interface EvidenceRecord {
  plot_id: string;
  county: string;
  season: string;
  crop: string;
  critical_growth_stage: CriticalGrowthStage;

  // Rainfall
  season_rain_mm: number;
  trigger_rain_mm: number;
  trigger_percentile: number;
  index_pays: boolean;
  low_local_rain: boolean;

  // Phenological timing
  max_dry_spell_days: number;
  /** ISO-8601 date */
  dry_spell_window_start: string;
  /** ISO-8601 date */
  dry_spell_window_end: string;
  dry_spell_overlaps_critical_stage: boolean;

  // Satellite vegetation
  ndvi_observed: number;
  ndvi_baseline_mean: number;
  ndvi_anomaly_z: number;
  ndvi_stress_cutoff_z: number;
  satellite_stress: boolean;

  evidence_source: EvidenceSource;
  /** ISO-8601 */
  evidence_timestamp_utc: string;
}

// ─── Core Contract 3: ClaimDecision ──────────────────────────────────────────

export interface ClaimDecision {
  claim_id: string;
  plot_id: string;
  outcome_class: OutcomeClass;
  recommended_action: RecommendedAction;
  /** Human-readable explanation, or null when no gap */
  failure_mode: string | null;
  cited_clause_ids: string[];
  citations_validated_by_code: boolean;
  /** Markdown-formatted adjuster brief */
  adjuster_brief: string;
  farmer_messages: FarmerMessages;
}

// ─── Core Contract 4: AuditRecord ───────────────────────────────────────────

export interface AuditRecord {
  audit_id: string;
  claim_id: string;
  plot_id: string;
  /** ISO-8601 */
  timestamp_utc: string;

  // Provenance
  model_version: string;
  prompt_version: string;
  /** Exactly 3 anchor IDs: [healthy, moderate, severe] */
  anchor_image_ids: [string, string, string];
  frozen_protocol_commit_hash: string;
  /** ISO-8601 */
  evidence_timestamp_utc: string;
  cache_hit: boolean;

  // Decision trail
  system_outcome_class: OutcomeClass;
  system_recommended_action: RecommendedAction;
  adjuster_id: string | null;
  adjuster_action: AdjusterAction;
  adjuster_notes: string | null;
  /** ISO-8601 or null if pending */
  decided_at_utc: string | null;
}

// ─── Index Doctor Simulation ─────────────────────────────────────────────────

export interface CountyStats {
  county: string;
  total_plots: number;
  gap_count: number;
  gap_rate: number;
  overpayment_count: number;
  overpayment_rate: number;
  payout_count: number;
  payout_frequency: number;
}

export interface SeasonStats {
  season: string;
  total_plots: number;
  gap_count: number;
  gap_rate: number;
  overpayment_count: number;
  overpayment_rate: number;
  payout_count: number;
  payout_frequency: number;
}

export interface IndexDoctorSimulation {
  trigger_percentile: number;
  trigger_rain_mm_median: number;
  total_plots: number;
  gap_count: number;
  /** 0.0 – 1.0 */
  gap_rate: number;
  overpayment_count: number;
  /** 0.0 – 1.0 */
  overpayment_rate: number;
  payout_count: number;
  /** 0.0 – 1.0 */
  payout_frequency: number;
  illustrative_payout_total_usd: number;
  /** Labelled assumption */
  flat_payout_per_plot_usd: number;
  county_breakdown: CountyStats[];
  season_breakdown: SeasonStats[];
  /** ISO-8601 */
  computed_at_utc: string;
}

// ─── Demo Case Composite ────────────────────────────────────────────────────

export interface DemoCase {
  _case: number;
  _label: string;
  _description: string;
  grading: GradingResult;
  evidence: EvidenceRecord;
  decision: ClaimDecision;
  audit: AuditRecord;
}

// ─── Google Earth Engine & Geospatial Analysis ─────────────────────────────

export interface HistoricalNdviPoint {
  year: number;
  season: string;
  ndvi_mean: number;
  rainfall_mm: number;
}

export interface EarthEngineAnalysis {
  plot_id: string;
  latitude: number;
  longitude: number;
  collection_sensor: string;
  rainfall_sensor: string;
  target_window_start: string;
  target_window_end: string;
  ndvi_observed: number;
  ndvi_baseline_mean: number;
  ndvi_baseline_std: number;
  ndvi_anomaly_z: number;
  satellite_stress: boolean;
  chirps_seasonal_rain_mm: number;
  chirps_historical_mean_mm: number;
  moisture_deficit_pct: number;
  max_dry_spell_days: number;
  dry_spell_overlaps_critical_stage: boolean;
  cloud_cover_pct: number;
  granule_id: string;
  baseline_years: number[];
  historical_ndvi_series: HistoricalNdviPoint[];
  computed_at_utc: string;
  is_live_gee_authenticated: boolean;
}

