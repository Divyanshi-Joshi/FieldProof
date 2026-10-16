package com.fieldproof.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.core.GradingResult;
import com.fieldproof.core.Signs;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Required by {@code docs/DAY1_PERSON_A.md §T11}:
 * JSON parsing test using one valid and one malformed recorded response.
 */
class JsonParsingTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Valid recorded model response parses cleanly into GradingResult record")
    void testValidRecordedResponseParsesSuccessfully() throws Exception {
        String validRecordedJson = """
                {
                  "is_crop_field": true,
                  "same_field_across_photos": true,
                  "screen_recapture_suspected": false,
                  "crop": "maize",
                  "growth_stage": "flowering",
                  "signs": {
                    "leaf_rolling_0_3": 3,
                    "canopy_senescence_0_3": 2,
                    "stunting_0_3": 1,
                    "soil_cracking_visible": true
                  },
                  "damage_type": "drought",
                  "confidence": 0.94,
                  "visible_evidence": [
                    "tightly rolled leaves lengthwise",
                    "canopy yellowing across upper third",
                    "prominent dry soil fissures"
                  ],
                  "photo_quality_flags": []
                }
                """;

        GradingResult result = objectMapper.readValue(validRecordedJson, GradingResult.class);

        assertNotNull(result);
        assertTrue(result.isCropField());
        assertTrue(result.sameFieldAcrossPhotos());
        assertFalse(result.screenRecaptureSuspected());
        assertEquals("maize", result.crop());
        assertEquals("flowering", result.growthStage());
        assertEquals("drought", result.damageType());
        assertEquals(0.94, result.confidence(), 0.001);

        assertNotNull(result.signs());
        assertEquals(3, result.signs().leafRolling0to3());
        assertEquals(2, result.signs().canopySenescence0to3());
        assertEquals(1, result.signs().stunting0to3());
        assertTrue(result.signs().soilCrackingVisible());

        assertEquals(3, result.visibleEvidence().size());
        assertTrue(result.visibleEvidence().contains("tightly rolled leaves lengthwise"));
        assertTrue(result.photoQualityFlags().isEmpty());
    }

    @Test
    @DisplayName("Malformed recorded response is rejected with a JsonProcessingException")
    void testMalformedRecordedResponseThrowsException() {
        // Truncated, unclosed JSON syntax typical of network drops or bad tokens
        String malformedJson = """
                {
                  "is_crop_field": true,
                  "crop": "maize",
                  "signs": {
                    "leaf_rolling_0_3": 3,
                    "canopy_senescence_0_3":
                """;

        assertThrows(JsonProcessingException.class, () ->
                objectMapper.readValue(malformedJson, GradingResult.class));
    }

    @Test
    @DisplayName("Invalid data types in JSON fields throw deserialization exception")
    void testInvalidFieldTypesThrowException() {
        String invalidTypeJson = """
                {
                  "is_crop_field": "not-a-boolean",
                  "signs": "not-an-object"
                }
                """;

        assertThrows(JsonProcessingException.class, () ->
                objectMapper.readValue(invalidTypeJson, GradingResult.class));
    }

    @Test
    @DisplayName("Signs validation constructor rejects out-of-range integer scores")
    void testSignsScoreRangeValidation() {
        assertThrows(IllegalArgumentException.class, () ->
                new Signs(4, 1, 0, false));
        assertThrows(IllegalArgumentException.class, () ->
                new Signs(-1, 0, 0, false));
    }
}
