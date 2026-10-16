package com.fieldproof.core;

import com.fieldproof.api.dto.Contracts;

/**
 * Deterministic severity-band mapping and two-pass agreement gate.
 * <p>
 * This class is 100% pure Java with zero AI/LLM SDK imports.
 * It proves that tested code — never the model — decides severity bands.
 * <p>
 * Rules are frozen in protocol/FROZEN_TRIGGER_PROTOCOL.md §5.2 and §5.3.
 */
public final class SeverityBand {

    private SeverityBand() {} // utility class

    // ── §5.2  Sign-vector → SeverityBand mapping ─────────────────────────────

    /**
     * Maps Gemini's four observable sign scores to a deterministic severity band.
     *
     * <ul>
     *   <li><b>SEVERE</b> — at least two signs ≥ 2, <em>or</em> any single sign = 3
     *       accompanied by visible soil cracking.</li>
     *   <li><b>MODERATE</b> — exactly one sign ≥ 2, <em>or</em> at least two signs ≥ 1
     *       with soil cracking visible, <em>or</em> all three signs ≥ 1.</li>
     *   <li><b>MILD</b> — any remaining visible damage that does not reach MODERATE.</li>
     *   <li><b>NONE</b> — all sign scores are 0 and no visible soil cracking.</li>
     * </ul>
     *
     * @param leafRolling      leaf rolling severity (0–3)
     * @param canopySenescence canopy senescence severity (0–3)
     * @param stunting         stand stunting severity (0–3)
     * @param soilCracking     whether dry soil cracking is visible
     * @return the deterministic severity band
     * @throws IllegalArgumentException if any sign is outside 0–3
     */
    public static Contracts.SeverityBand fromSigns(
            int leafRolling,
            int canopySenescence,
            int stunting,
            boolean soilCracking) {

        validateRange("leaf_rolling_0_3", leafRolling);
        validateRange("canopy_senescence_0_3", canopySenescence);
        validateRange("stunting_0_3", stunting);

        int countGe2 = 0;   // signs scoring ≥ 2
        int countGe1 = 0;   // signs scoring ≥ 1
        boolean anyAt3 = false;

        for (int s : new int[]{leafRolling, canopySenescence, stunting}) {
            if (s >= 2) countGe2++;
            if (s >= 1) countGe1++;
            if (s == 3) anyAt3 = true;
        }

        // SEVERE: ≥ 2 signs scoring ≥ 2, OR any sign = 3 with soil cracking
        if (countGe2 >= 2 || (anyAt3 && soilCracking)) {
            return Contracts.SeverityBand.SEVERE;
        }

        // MODERATE: exactly 1 sign ≥ 2, OR ≥ 2 signs ≥ 1 with soil cracking,
        //           OR all three signs ≥ 1
        if (countGe2 == 1 || (countGe1 >= 2 && soilCracking) || countGe1 >= 3) {
            return Contracts.SeverityBand.MODERATE;
        }

        // MILD: any remaining visible damage
        if (countGe1 > 0 || soilCracking) {
            return Contracts.SeverityBand.MILD;
        }

        // NONE: no visible damage
        return Contracts.SeverityBand.NONE;
    }

    /**
     * Convenience overload accepting the {@link Contracts.Signs} DTO directly.
     */
    public static Contracts.SeverityBand fromSigns(Contracts.Signs signs) {
        return fromSigns(
                signs.leafRolling(),
                signs.canopySenescence(),
                signs.stunting(),
                signs.soilCrackingVisible());
    }

    // ── §5.3  Two-pass agreement gate ────────────────────────────────────────

    /**
     * Result of comparing two independent grading passes.
     *
     * @param finalBand      the agreed band, or ABSTAIN if passes disagree
     * @param passesAgreed   true if both passes produced the same band
     * @param abstainToHuman true if the claim must be routed to a human adjuster
     */
    public record AgreementResult(
            Contracts.SeverityBand finalBand,
            boolean passesAgreed,
            boolean abstainToHuman) {}

    /**
     * Compares two independent grading-pass severity bands.
     * <p>
     * If both passes agree, returns the agreed band with {@code passesAgreed = true}.
     * If they disagree, returns {@code ABSTAIN} with {@code abstainToHuman = true},
     * routing the claim directly to a human loss adjuster.
     *
     * @param pass1Band band from the first Gemini pass
     * @param pass2Band band from the second Gemini pass (shuffled anchors)
     * @return the agreement result
     */
    public static AgreementResult agree(
            Contracts.SeverityBand pass1Band,
            Contracts.SeverityBand pass2Band) {

        if (pass1Band == pass2Band) {
            return new AgreementResult(pass1Band, true, false);
        }
        return new AgreementResult(Contracts.SeverityBand.ABSTAIN, false, true);
    }

    // ── §5.4  Photo-damaged criterion ────────────────────────────────────────

    /**
     * A plot is photo-damaged iff the two passes agreed AND the final band is
     * MODERATE or SEVERE.
     */
    public static boolean isPhotoDamaged(Contracts.SeverityBand finalBand, boolean passesAgreed) {
        return passesAgreed
                && (finalBand == Contracts.SeverityBand.MODERATE
                    || finalBand == Contracts.SeverityBand.SEVERE);
    }

    // ── Validation ───────────────────────────────────────────────────────────

    private static void validateRange(String name, int value) {
        if (value < 0 || value > 3) {
            throw new IllegalArgumentException(
                    name + " must be 0–3, got " + value);
        }
    }
}
