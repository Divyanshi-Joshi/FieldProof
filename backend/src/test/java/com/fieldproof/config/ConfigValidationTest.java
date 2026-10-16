package com.fieldproof.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests that {@link FieldProofConfigValidator} rejects missing required
 * properties with a clear message.
 * <p>
 * These are pure-Java unit tests — no Spring context needed.
 */
class ConfigValidationTest {

    @Test
    @DisplayName("All required values present → no exception")
    void allPresent() {
        var props = buildProps("my-project", "global", "gemini-3-flash-preview");
        // Should not throw
        assertDoesNotThrow(() -> new FieldProofConfigValidator(props));
    }

    @Test
    @DisplayName("Missing project-id → fails fast with clear message")
    void missingProjectId() {
        var props = buildProps("", "global", "gemini-3-flash-preview");
        var ex = assertThrows(IllegalStateException.class,
                () -> new FieldProofConfigValidator(props));
        assertTrue(ex.getMessage().contains("FIELDPROOF_GCP_PROJECT"),
                "Error message should mention the env variable name");
    }

    @Test
    @DisplayName("Missing vertex-location → fails fast with clear message")
    void missingVertexLocation() {
        var props = buildProps("my-project", "", "gemini-3-flash-preview");
        var ex = assertThrows(IllegalStateException.class,
                () -> new FieldProofConfigValidator(props));
        assertTrue(ex.getMessage().contains("FIELDPROOF_VERTEX_LOCATION"));
    }

    @Test
    @DisplayName("Missing model → fails fast with clear message")
    void missingModel() {
        var props = buildProps("my-project", "global", "");
        var ex = assertThrows(IllegalStateException.class,
                () -> new FieldProofConfigValidator(props));
        assertTrue(ex.getMessage().contains("FIELDPROOF_GEMINI_MODEL"));
    }

    @Test
    @DisplayName("All three required values missing → message lists all of them")
    void allMissing() {
        var props = buildProps(null, null, null);
        var ex = assertThrows(IllegalStateException.class,
                () -> new FieldProofConfigValidator(props));
        String msg = ex.getMessage();
        assertTrue(msg.contains("FIELDPROOF_GCP_PROJECT"));
        assertTrue(msg.contains("FIELDPROOF_VERTEX_LOCATION"));
        assertTrue(msg.contains("FIELDPROOF_GEMINI_MODEL"));
    }

    @Test
    @DisplayName("Blank (whitespace-only) values are rejected")
    void blankValuesRejected() {
        var props = buildProps("   ", "\t", "\n");
        var ex = assertThrows(IllegalStateException.class,
                () -> new FieldProofConfigValidator(props));
        String msg = ex.getMessage();
        assertTrue(msg.contains("FIELDPROOF_GCP_PROJECT"));
        assertTrue(msg.contains("FIELDPROOF_VERTEX_LOCATION"));
        assertTrue(msg.contains("FIELDPROOF_GEMINI_MODEL"));
    }

    // ── Helper ──────────────────────────────────────────────────────────────

    private static FieldProofProperties buildProps(
            String projectId, String vertexLocation, String model) {
        return new FieldProofProperties(
                new FieldProofProperties.Gcp(projectId, vertexLocation),
                new FieldProofProperties.Gemini(model, null, null, null, 4, 4),
                new FieldProofProperties.Pricing(null, null),
                new FieldProofProperties.Cache("cache/")
        );
    }
}
