package com.fieldproof.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.config.FieldProofProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for {@link GeminiGateway} focusing on cache integration and parameter handling.
 */
class GeminiGatewayTest {

    @TempDir
    Path tempDir;

    private ResponseCache responseCache;
    private ObjectMapper objectMapper;
    private FieldProofProperties props;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        props = new FieldProofProperties(
                new FieldProofProperties.Gcp("test-project", "global"),
                new FieldProofProperties.Gemini("gemini-3-flash-preview", "0.2", null, null, 2, 3),
                null,
                new FieldProofProperties.Cache(tempDir.toString())
        );
        responseCache = new ResponseCache(tempDir, objectMapper);
    }

    @Test
    @DisplayName("Cached entry returns immediately without calling client")
    void testCachedEntryReturnsWithoutCallingClient() {
        // Pre-populate cache
        String model = "gemini-3-flash-preview";
        String prompt = "grading_signs_v1";
        int pass = 1;
        String anchorOrder = "healthy,moderate,severe";
        String key = responseCache.computeKey(model, prompt, List.of(), anchorOrder, pass);

        responseCache.put(key, new GeminiResult("{\"is_crop_field\":true}", 150L, 60L, 500L, false, model));

        // Create gateway with dummy client supplier that would throw if invoked
        GeminiGateway gateway = new GeminiGateway(props, responseCache, objectMapper, () -> {
            throw new AssertionError("Client should not have been called on cache hit!");
        });

        GeminiCall call = new GeminiCall(
                prompt,
                "System instruction",
                List.of(GeminiCall.PartInput.text("Claim text")),
                null,
                pass,
                anchorOrder
        );

        GeminiResult result = gateway.generate(call);
        assertNotNull(result);
        assertTrue(result.fromCache());
        assertEquals("{\"is_crop_field\":true}", result.json());
        assertEquals(150L, result.inputTokens());
        assertEquals(60L, result.outputTokens());
    }
}
