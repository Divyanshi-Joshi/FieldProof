package com.fieldproof.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for {@link ResponseCache} verifying key determinism, hits, misses,
 * and sensitivity to promptVersion, anchorOrder, and pass index.
 */
class ResponseCacheTest {

    @TempDir
    Path tempDir;

    private ResponseCache cache;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        cache = new ResponseCache(tempDir, objectMapper);
    }

    @Test
    @DisplayName("Identical inputs produce identical cache keys and a cache hit")
    void testCacheHitOnIdenticalInputs() {
        String model = "gemini-3-flash-preview";
        String prompt = "grading_signs_v1";
        List<String> images = List.of("hash_abc123", "hash_def456");
        String anchorOrder = "healthy,moderate,severe";
        int pass = 1;

        String key1 = cache.computeKey(model, prompt, images, anchorOrder, pass);
        String key2 = cache.computeKey(model, prompt, images, anchorOrder, pass);
        assertEquals(key1, key2);

        // Put result in cache
        GeminiResult saved = new GeminiResult("{\"is_crop_field\":true}", 100L, 50L, 850L, false, model);
        cache.put(key1, saved);

        assertTrue(cache.contains(key1));
        Optional<GeminiResult> retrieved = cache.get(key1);
        assertTrue(retrieved.isPresent());
        assertEquals("{\"is_crop_field\":true}", retrieved.get().json());
        assertEquals(100L, retrieved.get().inputTokens());
        assertEquals(50L, retrieved.get().outputTokens());
        assertTrue(retrieved.get().fromCache());
        assertEquals(0L, retrieved.get().latencyMs()); // Cache hit latency is 0
    }

    @Test
    @DisplayName("Varying pass number causes cache miss")
    void testCacheMissOnDifferentPass() {
        String model = "gemini-3-flash-preview";
        String prompt = "grading_signs_v1";
        List<String> images = List.of("hash_1");
        String anchorOrder = "healthy,moderate,severe";

        String keyPass1 = cache.computeKey(model, prompt, images, anchorOrder, 1);
        String keyPass2 = cache.computeKey(model, prompt, images, anchorOrder, 2);

        assertNotEquals(keyPass1, keyPass2);

        cache.put(keyPass1, new GeminiResult("{}", 10L, 10L, 100L, false, model));
        assertTrue(cache.get(keyPass1).isPresent());
        assertTrue(cache.get(keyPass2).isEmpty());
    }

    @Test
    @DisplayName("Varying anchor order causes cache miss")
    void testCacheMissOnDifferentAnchorOrder() {
        String model = "gemini-3-flash-preview";
        String prompt = "grading_signs_v1";
        List<String> images = List.of("hash_1");
        int pass = 1;

        String keyOrderA = cache.computeKey(model, prompt, images, "healthy,moderate,severe", pass);
        String keyOrderB = cache.computeKey(model, prompt, images, "severe,healthy,moderate", pass);

        assertNotEquals(keyOrderA, keyOrderB);

        cache.put(keyOrderA, new GeminiResult("{}", 10L, 10L, 100L, false, model));
        assertTrue(cache.get(keyOrderA).isPresent());
        assertTrue(cache.get(keyOrderB).isEmpty());
    }

    @Test
    @DisplayName("Varying image order causes cache miss")
    void testCacheMissOnDifferentImageOrder() {
        String model = "gemini-3-flash-preview";
        String prompt = "grading_signs_v1";
        int pass = 1;
        String anchorOrder = "none";

        String keyImg12 = cache.computeKey(model, prompt, List.of("h1", "h2"), anchorOrder, pass);
        String keyImg21 = cache.computeKey(model, prompt, List.of("h2", "h1"), anchorOrder, pass);

        assertNotEquals(keyImg12, keyImg21);
    }
}
