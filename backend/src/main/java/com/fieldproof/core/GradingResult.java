package com.fieldproof.core;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Output of a single Gemini grading pass for a crop photo or photo bundle.
 * <p>
 * Evaluates field validity, crop type, signs, damage classification,
 * and photo quality flags.
 */
public record GradingResult(
        @JsonProperty("is_crop_field") boolean isCropField,
        @JsonProperty("same_field_across_photos") boolean sameFieldAcrossPhotos,
        @JsonProperty("screen_recapture_suspected") boolean screenRecaptureSuspected,
        @JsonProperty("crop") String crop,
        @JsonProperty("growth_stage") String growthStage,
        @JsonProperty("signs") Signs signs,
        @JsonProperty("damage_type") String damageType,
        @JsonProperty("confidence") double confidence,
        @JsonProperty("visible_evidence") List<String> visibleEvidence,
        @JsonProperty("photo_quality_flags") List<String> photoQualityFlags
) {
    public GradingResult {
        visibleEvidence = visibleEvidence == null ? List.of() : List.copyOf(visibleEvidence);
        photoQualityFlags = photoQualityFlags == null ? List.of() : List.copyOf(photoQualityFlags);
    }
}
