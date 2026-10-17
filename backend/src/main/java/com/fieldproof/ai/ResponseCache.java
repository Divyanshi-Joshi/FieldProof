package com.fieldproof.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.config.FieldProofProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * File-based JSON cache for Gemini model responses.
 * <p>
 * Key is SHA-256 of:
 * {@code model | promptVersion | orderedImageHashes | anchorOrder | pass}
 * <p>
 * Every response is written as a JSON file under {@code cache.dir} (default: {@code cache/}).
 * Cache hits never call the model and are flagged with {@code fromCache = true}.
 */
@Component
public class ResponseCache {

    private static final Logger log = LoggerFactory.getLogger(ResponseCache.class);

    private final Path cacheDir;
    private final ObjectMapper objectMapper;

    @Autowired
    public ResponseCache(FieldProofProperties props, ObjectMapper objectMapper) {
        String dir = (props.cache() != null && props.cache().dir() != null && !props.cache().dir().isBlank())
                ? props.cache().dir()
                : "cache/";
        this.cacheDir = Path.of(dir);
        this.objectMapper = objectMapper;
        ensureDirectoryExists();
    }

    /**
     * Constructor for direct unit testing with a custom directory.
     */
    public ResponseCache(Path cacheDir, ObjectMapper objectMapper) {
        this.cacheDir = cacheDir;
        this.objectMapper = objectMapper;
        ensureDirectoryExists();
    }

    private void ensureDirectoryExists() {
        try {
            if (!Files.exists(cacheDir)) {
                Files.createDirectories(cacheDir);
            }
        } catch (IOException e) {
            log.error("Failed to create cache directory: {}", cacheDir, e);
        }
    }

    /**
     * Computes the deterministic SHA-256 key for a call.
     *
     * @param model          Gemini model ID
     * @param promptVersion  version string of prompt template
     * @param imageHashes    list of SHA-256 hashes of input images in exact order
     * @param anchorOrder    string representation of anchor order, if used
     * @param pass           pass number (1 or 2)
     * @return 64-character lowercase hex SHA-256 string
     */
    public String computeKey(String model, String promptVersion, List<String> imageHashes, String anchorOrder, int pass) {
        String normalizedModel = model == null ? "" : model.trim();
        String normalizedPrompt = promptVersion == null ? "" : promptVersion.trim();
        String imagesJoined = (imageHashes == null || imageHashes.isEmpty()) ? "none" : String.join(",", imageHashes);
        String normalizedAnchors = anchorOrder == null ? "none" : anchorOrder.trim();

        String raw = String.format("%s|%s|%s|%s|pass=%d",
                normalizedModel, normalizedPrompt, imagesJoined, normalizedAnchors, pass);

        return sha256Hex(raw.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Computes the SHA-256 hex string of arbitrary byte content (e.g. image bytes).
     */
    public static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    /**
     * Looks up a cached response by key.
     *
     * @param key 64-character hex key
     * @return Optional containing the cached GeminiResult with {@code fromCache = true}, or empty if missed
     */
    public Optional<GeminiResult> get(String key) {
        Path filePath = cacheDir.resolve(key + ".json");
        if (!Files.exists(filePath)) {
            return Optional.empty();
        }

        try {
            CacheEntry entry = objectMapper.readValue(filePath.toFile(), CacheEntry.class);
            return Optional.of(new GeminiResult(
                    entry.json(),
                    entry.inputTokens(),
                    entry.outputTokens(),
                    0L, // Cache hit latency reported as 0 ms
                    true,
                    entry.modelVersion()
            ));
        } catch (Exception e) {
            log.warn("Corrupt cache file for key {}, treating as miss: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Stores a response in the cache.
     *
     * @param key    64-character hex key
     * @param result the result to cache
     */
    public void put(String key, GeminiResult result) {
        Path filePath = cacheDir.resolve(key + ".json");
        CacheEntry entry = new CacheEntry(
                key,
                result.json(),
                result.inputTokens(),
                result.outputTokens(),
                result.latencyMs(),
                result.modelVersion(),
                Instant.now().toString()
        );

        try {
            ensureDirectoryExists();
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), entry);
        } catch (IOException e) {
            log.warn("Failed to write cache file for key {}: {}", key, e.getMessage());
        }
    }

    /**
     * Returns true if a valid cache file exists for the key.
     */
    public boolean contains(String key) {
        return Files.exists(cacheDir.resolve(key + ".json"));
    }

    /**
     * Record stored in the JSON cache file.
     */
    public record CacheEntry(
            String key,
            String json,
            Long inputTokens,
            Long outputTokens,
            long latencyMs,
            String modelVersion,
            String cachedAt
    ) {}
}
