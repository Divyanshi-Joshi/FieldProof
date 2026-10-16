package com.fieldproof.core;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.api.dto.Contracts.DamageType;
import com.fieldproof.api.dto.Contracts.OutcomeClass;
import com.fieldproof.api.dto.Contracts.RecommendedAction;

import java.util.List;

/**
 * Three-signal concordance decision table (8 rows + abstention route).
 * <p>
 * This class is 100% pure Java with zero AI/LLM SDK imports.
 * It implements the deterministic reconciliation of three independent signals:
 * <ol>
 *   <li>Index trigger ({@code index_pays})</li>
 *   <li>Photo damage (severity band from agreement gate)</li>
 *   <li>Satellite vegetation stress ({@code satellite_stress})</li>
 * </ol>
 * Plus integrity gating and two-pass abstention.
 * <p>
 * Rules are frozen in protocol/FROZEN_TRIGGER_PROTOCOL.md §7.
 */
public final class ConcordanceTable {

    private ConcordanceTable() {} // utility class

    // ── Result DTO ───────────────────────────────────────────────────────────

    /**
     * Immutable result of the concordance evaluation.
     *
     * @param outcomeClass      the concordance outcome classification
     * @param recommendedAction the system's recommended next step
     * @param failureMode       human-readable description of the failure mode
     * @param citedClauseIds    policy clause IDs supporting this outcome
     */
    public record ConcordanceResult(
            OutcomeClass outcomeClass,
            RecommendedAction recommendedAction,
            String failureMode,
            List<String> citedClauseIds) {}

    // ── Evaluate ─────────────────────────────────────────────────────────────

    /**
     * Evaluates the three-signal concordance table.
     * <p>
     * Priority order (first match wins):
     * <ol>
     *   <li>Integrity failure → INTEGRITY_HOLD (CL-8.1)</li>
     *   <li>Two-pass abstention → ABSTAIN (CL-7.1)</li>
     *   <li>Non-weather damage → NON_WEATHER_LOSS (CL-6.1)</li>
     *   <li>Index pays + photo damage → CONFIRMED_PAYOUT (CL-2.1)</li>
     *   <li>Index pays + no photo damage → POSSIBLE_OVERPAYMENT (CL-2.2)</li>
     *   <li>No pay + photo damage + satellite stress + dry-spell overlap → PHENOLOGICAL_BASIS_RISK_GAP (CL-4.2)</li>
     *   <li>No pay + photo damage + satellite stress + no overlap → SPATIAL_BASIS_RISK_GAP (CL-4.3)</li>
     *   <li>No pay + photo damage + no satellite stress → EVIDENCE_CONFLICT (CL-5.1)</li>
     *   <li>No pay + no photo damage → CONSISTENT (CL-1.1)</li>
     * </ol>
     *
     * @param integrityPassed                 true if all photo integrity checks passed
     * @param abstainToHuman                  true if the two grading passes disagreed
     * @param finalSeverityBand               the agreed severity band (or ABSTAIN)
     * @param damageType                      the primary damage type from Gemini
     * @param indexPays                       true if the rainfall index triggers
     * @param satelliteStress                 true if NDVI anomaly z &lt; −1.0
     * @param drySpellOverlapsCriticalStage   true if the dry spell overlaps the crop's critical stage
     * @param lowLocalRain                    true if plot rain is below median but above trigger
     * @return the concordance result with outcome, action, failure mode and clause IDs
     */
    public static ConcordanceResult evaluate(
            boolean integrityPassed,
            boolean abstainToHuman,
            Contracts.SeverityBand finalSeverityBand,
            DamageType damageType,
            boolean indexPays,
            boolean satelliteStress,
            boolean drySpellOverlapsCriticalStage,
            boolean lowLocalRain) {

        // ── Row 8: Integrity failure (highest priority) ──────────────────────
        if (!integrityPassed) {
            return new ConcordanceResult(
                    OutcomeClass.INTEGRITY_HOLD,
                    RecommendedAction.HOLD_NO_RECOMMENDATION,
                    "One or more photos failed integrity checks "
                            + "(duplicate, screen recapture, mismatched fields, or EXIF issues). "
                            + "Claim held with no automated recommendation.",
                    List.of("CL-8.1"));
        }

        // ── Row 9: Two-pass disagreement (abstain to human) ─────────────────
        if (abstainToHuman) {
            return new ConcordanceResult(
                    OutcomeClass.ABSTAIN,
                    RecommendedAction.ABSTAIN_TO_HUMAN,
                    "The two independent grading passes produced different severity bands. "
                            + "System abstains; claim routed to human adjuster for manual review.",
                    List.of("CL-7.1"));
        }

        // ── Row 7: Non-weather damage ────────────────────────────────────────
        if (isNonWeatherDamage(damageType)) {
            return new ConcordanceResult(
                    OutcomeClass.NON_WEATHER_LOSS,
                    RecommendedAction.ROUTE_TO_ADVISORY,
                    "Photo evidence identifies non-weather damage (type: " + damageType.name()
                            + "). Not covered under this index policy. "
                            + "Routed to agricultural advisory or alternative cover.",
                    List.of("CL-6.1"));
        }

        // ── Weather / drought path ───────────────────────────────────────────
        boolean photoDamaged = SeverityBand.isPhotoDamaged(finalSeverityBand, true);

        // Row 1: Pays + Damage → CONFIRMED_PAYOUT
        if (indexPays && photoDamaged) {
            return new ConcordanceResult(
                    OutcomeClass.CONFIRMED_PAYOUT,
                    RecommendedAction.FAST_TRACK,
                    "Index triggered and photo evidence confirms "
                            + finalSeverityBand.name() + " drought damage. Fast-track for adjuster sign-off.",
                    List.of("CL-2.1"));
        }

        // Row 2: Pays + No damage → POSSIBLE_OVERPAYMENT
        if (indexPays && !photoDamaged) {
            return new ConcordanceResult(
                    OutcomeClass.POSSIBLE_OVERPAYMENT,
                    RecommendedAction.REVIEW,
                    "Index triggered but photo evidence does not confirm MODERATE or SEVERE damage "
                            + "(band: " + finalSeverityBand.name() + "). Possible overpayment; manual review required.",
                    List.of("CL-2.2"));
        }

        // Row 3: No pay + Damage + Satellite stress + Dry-spell overlap → PHENOLOGICAL GAP
        if (!indexPays && photoDamaged && satelliteStress && drySpellOverlapsCriticalStage) {
            return new ConcordanceResult(
                    OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP,
                    RecommendedAction.ESCALATE,
                    "Seasonal total above trigger but a dry spell overlapped the critical growth stage. "
                            + "Photo (" + finalSeverityBand.name() + ") and satellite (stressed) confirm plot-level damage. "
                            + "Phenological basis-risk gap.",
                    List.of("CL-4.2"));
        }

        // Row 4: No pay + Damage + Satellite stress + No overlap (low local rain) → SPATIAL GAP
        if (!indexPays && photoDamaged && satelliteStress && !drySpellOverlapsCriticalStage) {
            return new ConcordanceResult(
                    OutcomeClass.SPATIAL_BASIS_RISK_GAP,
                    RecommendedAction.ESCALATE,
                    "Seasonal total above trigger and dry spell did not overlap critical stage, "
                            + "but photo (" + finalSeverityBand.name() + ") and satellite (stressed) confirm damage. "
                            + (lowLocalRain ? "Plot-level rain below county median. " : "")
                            + "Spatial basis-risk gap: area index missed localized deficit.",
                    List.of("CL-4.3"));
        }

        // Row 5: No pay + Damage + Satellite healthy → EVIDENCE_CONFLICT
        if (!indexPays && photoDamaged && !satelliteStress) {
            return new ConcordanceResult(
                    OutcomeClass.EVIDENCE_CONFLICT,
                    RecommendedAction.ASK_MORE_PHOTOS_HUMAN_REVIEW,
                    "Photo evidence confirms " + finalSeverityBand.name()
                            + " weather damage but satellite vegetation data does not confirm stress. "
                            + "Request additional photos; route to human expert review.",
                    List.of("CL-5.1"));
        }

        // Row 6: No pay + No damage → CONSISTENT
        return new ConcordanceResult(
                OutcomeClass.CONSISTENT,
                RecommendedAction.NO_ACTION,
                "Index did not trigger and photo evidence does not confirm significant damage "
                        + "(band: " + finalSeverityBand.name() + "). Consistent — no action required.",
                List.of("CL-1.1"));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Returns true if the damage type is a non-weather peril excluded from
     * index cover: pest, disease, weed, nutrient, or other.
     */
    private static boolean isNonWeatherDamage(DamageType type) {
        return switch (type) {
            case pest, disease, weed, nutrient, other -> true;
            case drought, none                        -> false;
        };
    }
}
