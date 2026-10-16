package com.fieldproof.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * FieldProof Contract Records (Java 21)
 * ======================================
 * Auto-generated from /contracts/*.schema.json — keep in sync.
 * Used by the Spring Boot 3 backend.
 *
 * RULE: If you change a schema, regenerate this file.
 * All records use Jackson annotations for faithful JSON serialization.
 */
public final class Contracts {

    private Contracts() {} // utility class — no instances

    // ─── Shared Enums ────────────────────────────────────────────────────────

    public enum SeverityBand {
        NONE, MILD, MODERATE, SEVERE, ABSTAIN
    }

    public enum DamageType {
        drought, pest, disease, weed, nutrient, other, none
    }

    public enum GrowthStage {
        seedling, vegetative, flowering, grain_filling, maturity, unknown
    }

    public enum CriticalGrowthStage {
        seedling, vegetative, flowering, grain_filling, maturity
    }

    public enum OutcomeClass {
        CONFIRMED_PAYOUT,
        POSSIBLE_OVERPAYMENT,
        PHENOLOGICAL_BASIS_RISK_GAP,
        SPATIAL_BASIS_RISK_GAP,
        EVIDENCE_CONFLICT,
        NON_WEATHER_LOSS,
        CONSISTENT,
        INTEGRITY_HOLD,
        ABSTAIN
    }

    public enum RecommendedAction {
        FAST_TRACK,
        REVIEW,
        ESCALATE,
        ASK_MORE_PHOTOS_HUMAN_REVIEW,
        ROUTE_TO_ADVISORY,
        NO_ACTION,
        HOLD_NO_RECOMMENDATION,
        ABSTAIN_TO_HUMAN
    }

    public enum AdjusterAction {
        PENDING, APPROVED, REJECTED, ESCALATED
    }

    public enum EvidenceSource {
        BIGQUERY_DATASET, OPEN_METEO_FALLBACK
    }

    // ─── Shared Sub-Types ────────────────────────────────────────────────────

    /**
     * Observable damage signs scored by Gemini.
     * Each 0-3 integer is set by the model; the severity band is computed by code.
     */
    public record Signs(
        @JsonProperty("leaf_rolling_0_3")      int leafRolling,
        @JsonProperty("canopy_senescence_0_3") int canopySenescence,
        @JsonProperty("stunting_0_3")          int stunting,
        @JsonProperty("soil_cracking_visible") boolean soilCrackingVisible
    ) {}

    /**
     * Output of a single Gemini grading pass (with a specific anchor order).
     */
    public record GradingPass(
        @JsonProperty("is_crop_field")              boolean isCropField,
        @JsonProperty("same_field_across_photos")   boolean sameFieldAcrossPhotos,
        @JsonProperty("screen_recapture_suspected") boolean screenRecaptureSuspected,
        @JsonProperty("crop")                       String crop,
        @JsonProperty("growth_stage")               GrowthStage growthStage,
        @JsonProperty("signs")                      Signs signs,
        @JsonProperty("damage_type")                DamageType damageType,
        @JsonProperty("confidence")                 double confidence,
        @JsonProperty("visible_evidence")           List<String> visibleEvidence,
        @JsonProperty("photo_quality_flags")        List<String> photoQualityFlags
    ) {}

    /**
     * Multilingual farmer-facing messages. English is always present.
     */
    public record FarmerMessages(
        @JsonProperty("en") String en,
        @JsonProperty("hi") String hi,
        @JsonProperty("sw") String sw
    ) {}

    // ─── Core Contract 1: GradingResult ──────────────────────────────────────

    /**
     * Output of the Forensics Agent: integrity checks, calibrated two-pass
     * Gemini grading, and agreement-gate decision for a single claim bundle.
     */
    public record GradingResult(
        // Identifiers
        @JsonProperty("claim_id")    String claimId,
        @JsonProperty("plot_id")     String plotId,
        @JsonProperty("uploaded_at") Instant uploadedAt,
        @JsonProperty("photo_urls")  List<String> photoUrls,

        // Integrity
        @JsonProperty("integrity_passed")        boolean integrityPassed,
        @JsonProperty("duplicate_within_claim")  boolean duplicateWithinClaim,
        @JsonProperty("duplicate_across_claims") boolean duplicateAcrossClaims,
        @JsonProperty("matched_earlier_claim_id") String matchedEarlierClaimId,
        @JsonProperty("rejected_photo_indices")  List<Integer> rejectedPhotoIndices,
        @JsonProperty("exif_timestamp_present")  boolean exifTimestampPresent,
        @JsonProperty("exif_gps_present")        boolean exifGpsPresent,
        @JsonProperty("integrity_flags")         List<String> integrityFlags,

        // Two-pass grading
        @JsonProperty("pass_1") GradingPass pass1,
        @JsonProperty("pass_2") GradingPass pass2,

        // Consolidated grading
        @JsonProperty("is_crop_field")              boolean isCropField,
        @JsonProperty("same_field_across_photos")   boolean sameFieldAcrossPhotos,
        @JsonProperty("screen_recapture_suspected") boolean screenRecaptureSuspected,
        @JsonProperty("crop")                       String crop,
        @JsonProperty("growth_stage")               GrowthStage growthStage,
        @JsonProperty("signs")                      Signs signs,
        @JsonProperty("damage_type")                DamageType damageType,
        @JsonProperty("confidence")                 double confidence,
        @JsonProperty("visible_evidence")           List<String> visibleEvidence,
        @JsonProperty("photo_quality_flags")        List<String> photoQualityFlags,

        // Agreement gate
        @JsonProperty("pass_1_band")        SeverityBand pass1Band,
        @JsonProperty("pass_2_band")        SeverityBand pass2Band,
        @JsonProperty("passes_agreed")      boolean passesAgreed,
        @JsonProperty("final_severity_band") SeverityBand finalSeverityBand,
        @JsonProperty("abstain_to_human")   boolean abstainToHuman
    ) {}

    // ─── Core Contract 2: EvidenceRecord ─────────────────────────────────────

    /**
     * Independent evidence gathered by the Concordance Agent: rainfall,
     * dry-spell timing, and satellite NDVI anomaly for a single plot/season.
     */
    public record EvidenceRecord(
        @JsonProperty("plot_id")              String plotId,
        @JsonProperty("county")               String county,
        @JsonProperty("season")               String season,
        @JsonProperty("crop")                 String crop,
        @JsonProperty("critical_growth_stage") CriticalGrowthStage criticalGrowthStage,

        // Rainfall
        @JsonProperty("season_rain_mm")     double seasonRainMm,
        @JsonProperty("trigger_rain_mm")    double triggerRainMm,
        @JsonProperty("trigger_percentile") int triggerPercentile,
        @JsonProperty("index_pays")         boolean indexPays,
        @JsonProperty("low_local_rain")     boolean lowLocalRain,

        // Phenological timing
        @JsonProperty("max_dry_spell_days")                int maxDrySpellDays,
        @JsonProperty("dry_spell_window_start")            LocalDate drySpellWindowStart,
        @JsonProperty("dry_spell_window_end")              LocalDate drySpellWindowEnd,
        @JsonProperty("dry_spell_overlaps_critical_stage") boolean drySpellOverlapsCriticalStage,

        // Satellite vegetation
        @JsonProperty("ndvi_observed")       double ndviObserved,
        @JsonProperty("ndvi_baseline_mean")  double ndviBaselineMean,
        @JsonProperty("ndvi_anomaly_z")      double ndviAnomalyZ,
        @JsonProperty("ndvi_stress_cutoff_z") double ndviStressCutoffZ,
        @JsonProperty("satellite_stress")    boolean satelliteStress,

        @JsonProperty("evidence_source")        EvidenceSource evidenceSource,
        @JsonProperty("evidence_timestamp_utc") Instant evidenceTimestampUtc
    ) {}

    // ─── Core Contract 3: ClaimDecision ──────────────────────────────────────

    /**
     * Output of the three-signal concordance and the Policy Agent:
     * outcome, failure mode, policy-cited brief, and farmer messages.
     */
    public record ClaimDecision(
        @JsonProperty("claim_id")                  String claimId,
        @JsonProperty("plot_id")                   String plotId,
        @JsonProperty("outcome_class")             OutcomeClass outcomeClass,
        @JsonProperty("recommended_action")        RecommendedAction recommendedAction,
        @JsonProperty("failure_mode")              String failureMode,
        @JsonProperty("cited_clause_ids")          List<String> citedClauseIds,
        @JsonProperty("citations_validated_by_code") boolean citationsValidatedByCode,
        @JsonProperty("adjuster_brief")            String adjusterBrief,
        @JsonProperty("farmer_messages")           FarmerMessages farmerMessages
    ) {}

    // ─── Core Contract 4: AuditRecord ────────────────────────────────────────

    /**
     * Immutable audit trail record written to BigQuery after adjuster sign-off.
     */
    public record AuditRecord(
        @JsonProperty("audit_id")     String auditId,
        @JsonProperty("claim_id")     String claimId,
        @JsonProperty("plot_id")      String plotId,
        @JsonProperty("timestamp_utc") Instant timestampUtc,

        // Provenance
        @JsonProperty("model_version")                String modelVersion,
        @JsonProperty("prompt_version")               String promptVersion,
        @JsonProperty("anchor_image_ids")             List<String> anchorImageIds,
        @JsonProperty("frozen_protocol_commit_hash")  String frozenProtocolCommitHash,
        @JsonProperty("evidence_timestamp_utc")       Instant evidenceTimestampUtc,
        @JsonProperty("cache_hit")                    boolean cacheHit,

        // Decision trail
        @JsonProperty("system_outcome_class")         OutcomeClass systemOutcomeClass,
        @JsonProperty("system_recommended_action")    RecommendedAction systemRecommendedAction,
        @JsonProperty("adjuster_id")                  String adjusterId,
        @JsonProperty("adjuster_action")              AdjusterAction adjusterAction,
        @JsonProperty("adjuster_notes")               String adjusterNotes,
        @JsonProperty("decided_at_utc")               Instant decidedAtUtc
    ) {}

    // ─── Index Doctor Simulation ─────────────────────────────────────────────

    /**
     * Per-county statistics at a given trigger percentile.
     */
    public record CountyStats(
        @JsonProperty("county")            String county,
        @JsonProperty("total_plots")       int totalPlots,
        @JsonProperty("gap_count")         int gapCount,
        @JsonProperty("gap_rate")          double gapRate,
        @JsonProperty("overpayment_count") int overpaymentCount,
        @JsonProperty("overpayment_rate")  double overpaymentRate,
        @JsonProperty("payout_count")      int payoutCount,
        @JsonProperty("payout_frequency")  double payoutFrequency
    ) {}

    /**
     * Per-season statistics at a given trigger percentile.
     */
    public record SeasonStats(
        @JsonProperty("season")            String season,
        @JsonProperty("total_plots")       int totalPlots,
        @JsonProperty("gap_count")         int gapCount,
        @JsonProperty("gap_rate")          double gapRate,
        @JsonProperty("overpayment_count") int overpaymentCount,
        @JsonProperty("overpayment_rate")  double overpaymentRate,
        @JsonProperty("payout_count")      int payoutCount,
        @JsonProperty("payout_frequency")  double payoutFrequency
    ) {}

    /**
     * Response from the Index Doctor slider endpoint.
     */
    public record IndexDoctorSimulation(
        @JsonProperty("trigger_percentile")           int triggerPercentile,
        @JsonProperty("trigger_rain_mm_median")       double triggerRainMmMedian,
        @JsonProperty("total_plots")                  int totalPlots,
        @JsonProperty("gap_count")                    int gapCount,
        @JsonProperty("gap_rate")                     double gapRate,
        @JsonProperty("overpayment_count")            int overpaymentCount,
        @JsonProperty("overpayment_rate")             double overpaymentRate,
        @JsonProperty("payout_count")                 int payoutCount,
        @JsonProperty("payout_frequency")             double payoutFrequency,
        @JsonProperty("illustrative_payout_total_usd") double illustrativePayoutTotalUsd,
        @JsonProperty("flat_payout_per_plot_usd")     double flatPayoutPerPlotUsd,
        @JsonProperty("county_breakdown")             List<CountyStats> countyBreakdown,
        @JsonProperty("season_breakdown")             List<SeasonStats> seasonBreakdown,
        @JsonProperty("computed_at_utc")              Instant computedAtUtc
    ) {}
}
