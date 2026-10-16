package com.fieldproof.core;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Observable signs of drought damage scored by Gemini on a 0–3 integer scale,
 * plus a boolean flag for soil cracking.
 * <p>
 * Scored values:
 * <ul>
 *   <li>0 = None</li>
 *   <li>1 = Slight</li>
 *   <li>2 = Clear</li>
 *   <li>3 = Severe</li>
 * </ul>
 *
 * @param leafRolling0to3        Leaves curled or folded lengthwise (0–3)
 * @param canopySenescence0to3   Yellowing, browning, or drying across canopy (0–3)
 * @param stunting0to3           Patches or short plants vs reference (0–3)
 * @param soilCrackingVisible    Whether dry soil cracking is visible
 */
public record Signs(
        @JsonProperty("leaf_rolling_0_3") int leafRolling0to3,
        @JsonProperty("canopy_senescence_0_3") int canopySenescence0to3,
        @JsonProperty("stunting_0_3") int stunting0to3,
        @JsonProperty("soil_cracking_visible") boolean soilCrackingVisible
) {
    public Signs {
        validateRange("leafRolling0to3", leafRolling0to3);
        validateRange("canopySenescence0to3", canopySenescence0to3);
        validateRange("stunting0to3", stunting0to3);
    }

    private static void validateRange(String name, int val) {
        if (val < 0 || val > 3) {
            throw new IllegalArgumentException(name + " must be between 0 and 3, got: " + val);
        }
    }
}
