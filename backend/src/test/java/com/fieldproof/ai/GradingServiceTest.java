package com.fieldproof.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.api.dto.Contracts.SeverityBand;
import com.fieldproof.core.GradingResult;
import com.fieldproof.core.Signs;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link GradingService}.
 */
class GradingServiceTest {

    private GeminiGateway gateway;
    private PromptLibrary promptLibrary;
    private AnchorLibrary anchorLibrary;
    private ObjectMapper objectMapper;
    private GradingService gradingService;

    @BeforeEach
    void setUp() {
        gateway = Mockito.mock(GeminiGateway.class);
        promptLibrary = new PromptLibrary();
        objectMapper = new ObjectMapper();
        anchorLibrary = new AnchorLibrary(objectMapper);

        // Pre-register anchors in memory for testing
        anchorLibrary.registerAnchor("healthy", new byte[]{1, 2, 3}, "healthy.jpg");
        anchorLibrary.registerAnchor("moderate", new byte[]{4, 5, 6}, "moderate.jpg");
        anchorLibrary.registerAnchor("severe", new byte[]{7, 8, 9}, "severe.jpg");

        gradingService = new GradingService(gateway, promptLibrary, anchorLibrary, objectMapper);
    }

    @Test
    @DisplayName("Grading execution computes deterministic severity band from Gemini signs")
    void testGradingExecutionComputesSeverityBand() {
        String mockJson = """
                {
                  "is_crop_field": true,
                  "same_field_across_photos": true,
                  "screen_recapture_suspected": false,
                  "crop": "maize",
                  "growth_stage": "vegetative",
                  "signs": {
                    "leaf_rolling_0_3": 3,
                    "canopy_senescence_0_3": 2,
                    "stunting_0_3": 1,
                    "soil_cracking_visible": true
                  },
                  "damage_type": "drought",
                  "confidence": 0.92,
                  "visible_evidence": ["leaf curl", "pale canopy"],
                  "photo_quality_flags": []
                }
                """;

        when(gateway.generate(any())).thenReturn(
                new GeminiResult(mockJson, 200L, 80L, 400L, false, "gemini-3-flash-preview")
        );

        GradingService.PhotoInput photo = new GradingService.PhotoInput("claim_1.jpg", new byte[]{10, 20}, "image/jpeg");
        var execution = gradingService.grade(List.of(photo), true, 1);

        assertNotNull(execution);
        assertEquals(SeverityBand.SEVERE, execution.severityBand());
        assertNotEquals("none", execution.anchorOrder());
        assertEquals("maize", execution.gradingResult().crop());
        assertEquals(3, execution.gradingResult().signs().leafRolling0to3());
    }

    @Test
    @DisplayName("Anchor shuffling is deterministic and differs across pass 1 and pass 2")
    void testAnchorShufflingDiffersAcrossPasses() {
        var anchorsPass1 = anchorLibrary.getAnchorsShuffled(1);
        var anchorsPass2 = anchorLibrary.getAnchorsShuffled(2);

        String order1 = AnchorLibrary.getAnchorOrderString(anchorsPass1);
        String order2 = AnchorLibrary.getAnchorOrderString(anchorsPass2);

        // Deterministic: repeated call for pass 1 gives same order
        assertEquals(order1, AnchorLibrary.getAnchorOrderString(anchorLibrary.getAnchorsShuffled(1)));
        // Passes produce different permutations
        assertNotEquals(order1, order2);
    }
}
