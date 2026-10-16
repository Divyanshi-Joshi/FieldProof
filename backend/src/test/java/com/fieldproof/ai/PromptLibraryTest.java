package com.fieldproof.ai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link PromptLibrary}.
 */
class PromptLibraryTest {

    private PromptLibrary promptLibrary;

    @BeforeEach
    void setUp() {
        promptLibrary = new PromptLibrary();
    }

    @Test
    @DisplayName("Loads grading_raw_v0 successfully from classpath")
    void testLoadRawPrompt() {
        String template = promptLibrary.getTemplate(PromptLibrary.PROMPT_RAW_V0);
        assertNotNull(template);
        assertFalse(template.isBlank());
        assertTrue(template.contains("damaged"));
        assertTrue(template.contains("damage_type"));
    }

    @Test
    @DisplayName("Loads grading_signs_v1 and interpolates allowed damage types")
    void testLoadSignsPrompt() {
        String formatted = promptLibrary.getFormattedPrompt(PromptLibrary.PROMPT_SIGNS_V1);
        assertNotNull(formatted);
        assertFalse(formatted.isBlank());
        assertTrue(formatted.contains("leaf rolling"));
        assertTrue(formatted.contains("canopy senescence"));
        assertTrue(formatted.contains("stunting"));
        assertTrue(formatted.contains("soil cracking visible"));
    }

    @Test
    @DisplayName("Throws IllegalArgumentException for nonexistent prompt version")
    void testNonexistentPromptThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
                promptLibrary.getTemplate("nonexistent_v99"));
    }

    @Test
    @DisplayName("Loads allowed damage types from label-map.yml")
    void testLabelMapLoaded() {
        var types = promptLibrary.getAllowedDamageTypes();
        assertNotNull(types);
        assertFalse(types.isEmpty());
        assertTrue(types.contains("none"));
        assertTrue(types.contains("other"));
    }
}
