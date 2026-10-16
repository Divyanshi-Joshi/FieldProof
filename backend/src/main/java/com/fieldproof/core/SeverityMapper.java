package com.fieldproof.core;

import com.fieldproof.api.dto.Contracts.SeverityBand;

/**
 * Deterministic sign-vector to severity-band mapping for Day 1 calibration.
 * <p>
 * Implements the table-driven mapping specified in {@code docs/DAY1_PERSON_A.md §T6}:
 * <ul>
 *   <li><b>SEVERE</b> — at least two of the three 0–3 signs score 2 or more (from idea document).</li>
 *   <li><b>MODERATE</b> — exactly one sign scores 2 or more [PROPOSED — needs approval under D8].</li>
 *   <li><b>MILD</b> — no sign scores 2 or more, but at least one scores 1 [PROPOSED — needs approval under D8].</li>
 *   <li><b>NONE</b> — all three signs score 0 [PROPOSED — needs approval under D8].</li>
 * </ul>
 * <p>
 * <em>Note on soil cracking:</em> Soil cracking visible does not change the severity band in this
 * Day 1 proposal; it is reported as a flag only.
 */
public final class SeverityMapper {

    private SeverityMapper() {} // Utility class

    /**
     * Maps a {@link Signs} record to a deterministic {@link SeverityBand}.
     *
     * @param signs the scored signs record
     * @return deterministic severity band (SEVERE, MODERATE, MILD, or NONE)
     * @throws IllegalArgumentException if signs is null or any sign score is outside 0–3
     */
    public static SeverityBand map(Signs signs) {
        if (signs == null) {
            throw new IllegalArgumentException("signs must not be null");
        }
        return map(signs.leafRolling0to3(), signs.canopySenescence0to3(), signs.stunting0to3(), signs.soilCrackingVisible());
    }

    /**
     * Maps sign scores to a deterministic {@link SeverityBand}.
     *
     * @param leafRolling0to3      leaf rolling score (0–3)
     * @param canopySenescence0to3 canopy senescence score (0–3)
     * @param stunting0to3         stunting score (0–3)
     * @param soilCrackingVisible  whether dry soil cracking is visible (flag only in T6 proposal)
     * @return deterministic severity band (SEVERE, MODERATE, MILD, or NONE)
     * @throws IllegalArgumentException if any sign is outside 0–3
     */
    public static SeverityBand map(int leafRolling0to3, int canopySenescence0to3, int stunting0to3, boolean soilCrackingVisible) {
        validateRange("leafRolling0to3", leafRolling0to3);
        validateRange("canopySenescence0to3", canopySenescence0to3);
        validateRange("stunting0to3", stunting0to3);

        int countGe2 = 0;
        int countGe1 = 0;

        for (int score : new int[]{leafRolling0to3, canopySenescence0to3, stunting0to3}) {
            if (score >= 2) {
                countGe2++;
            }
            if (score >= 1) {
                countGe1++;
            }
        }

        // Rule 1: SEVERE — at least two of the three 0 to 3 signs score 2 or more (from idea doc)
        if (countGe2 >= 2) {
            return SeverityBand.SEVERE;
        }

        // Rule 2: MODERATE — exactly one sign scores 2 or more [PROPOSED — needs approval under D8]
        if (countGe2 == 1) {
            return SeverityBand.MODERATE;
        }

        // Rule 3: MILD — no sign scores 2 or more, but at least one scores 1 [PROPOSED — needs approval under D8]
        if (countGe1 >= 1) {
            return SeverityBand.MILD;
        }

        // Rule 4: NONE — all three signs score 0 [PROPOSED — needs approval under D8]
        return SeverityBand.NONE;
    }

    private static void validateRange(String name, int value) {
        if (value < 0 || value > 3) {
            throw new IllegalArgumentException(name + " must be between 0 and 3, got: " + value);
        }
    }
}
