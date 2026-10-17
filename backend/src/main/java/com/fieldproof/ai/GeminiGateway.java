package com.fieldproof.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.config.FieldProofProperties;
import com.google.genai.Client;
import com.google.genai.errors.ApiException;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * Production gateway for Vertex AI Gemini calls.
 * <p>
 * Responsibilities:
 * <ul>
 *   <li>Builds GenAI {@link Client} in Vertex AI mode with Application Default Credentials (no API keys).</li>
 *   <li>Enforces structured JSON generation via {@code responseMimeType("application/json")}.</li>
 *   <li>Checks {@link ResponseCache} before calling Gemini (cache hits return immediately).</li>
 *   <li>Limits concurrency using a {@link Semaphore} matching {@code gemini.max-concurrency}.</li>
 *   <li>Retries HTTP 429 and 5xx errors with exponential backoff and jitter, capped by {@code max-retries}.</li>
 *   <li>Parses output with Jackson into {@code responseSchemaClass}, retrying once on parse failure.</li>
 *   <li>Tracks cumulative parse failures.</li>
 * </ul>
 */
@Service
public class GeminiGateway {

    private static final Logger log = LoggerFactory.getLogger(GeminiGateway.class);

    private final FieldProofProperties props;
    private final ResponseCache responseCache;
    private final ObjectMapper objectMapper;
    private final Semaphore semaphore;
    private final Supplier<Client> clientSupplier;
    private final AtomicLong parseFailureCount = new AtomicLong(0);
    private final Random random = new Random();

    @Autowired
    public GeminiGateway(FieldProofProperties props, ResponseCache responseCache, ObjectMapper objectMapper) {
        this.props = props;
        this.responseCache = responseCache;
        this.objectMapper = objectMapper;
        int maxConcurrency = (props.gemini() != null && props.gemini().maxConcurrency() > 0)
                ? props.gemini().maxConcurrency()
                : 4;
        this.semaphore = new Semaphore(maxConcurrency);
        this.clientSupplier = () -> Client.builder()
                .project(props.gcp().projectId())
                .location(props.gcp().vertexLocation())
                .build();
    }

    /**
     * Testing constructor allowing client override and customized semaphore.
     */
    public GeminiGateway(FieldProofProperties props,
                         ResponseCache responseCache,
                         ObjectMapper objectMapper,
                         Supplier<Client> clientSupplier) {
        this.props = props;
        this.responseCache = responseCache;
        this.objectMapper = objectMapper;
        int maxConcurrency = (props.gemini() != null && props.gemini().maxConcurrency() > 0)
                ? props.gemini().maxConcurrency()
                : 4;
        this.semaphore = new Semaphore(maxConcurrency);
        this.clientSupplier = clientSupplier;
    }

    /**
     * Generates content from Gemini or returns a cached result.
     *
     * @param call specification of the model invocation
     * @return {@link GeminiResult} containing the validated JSON and metadata
     */
    public GeminiResult generate(GeminiCall call) {
        String model = props.gemini().model();

        // 1. Compute image hashes for deterministic cache keying
        List<String> imageHashes = new ArrayList<>();
        for (GeminiCall.PartInput p : call.parts()) {
            if (p.isImage()) {
                imageHashes.add(ResponseCache.sha256Hex(p.imageBytes()));
            }
        }

        // 2. Compute cache key and check ResponseCache
        String cacheKey = responseCache.computeKey(
                model,
                call.promptVersion(),
                imageHashes,
                call.anchorOrder(),
                call.pass()
        );

        var cached = responseCache.get(cacheKey);
        if (cached.isPresent()) {
            log.debug("Cache hit for key {}", cacheKey);
            return cached.get();
        }

        // 3. Acquire semaphore concurrency permit
        try {
            semaphore.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while acquiring Gemini concurrency permit", e);
        }

        try {
            // 4. Execute with retries on 429/5xx and single parse retry
            GeminiResult result = executeWithRetry(call, cacheKey);
            responseCache.put(cacheKey, result);
            return result;
        } finally {
            semaphore.release();
        }
    }

    private GeminiResult executeWithRetry(GeminiCall call, String cacheKey) {
        int maxRetries = (props.gemini() != null && props.gemini().maxRetries() > 0)
                ? props.gemini().maxRetries()
                : 4;
        String model = props.gemini().model();
        Client client = clientSupplier.get();

        long startTime = System.currentTimeMillis();
        boolean parseRetryAttempted = false;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Build request config
                GenerateContentConfig.Builder configBuilder = GenerateContentConfig.builder()
                        .responseMimeType("application/json");

                if (call.systemInstruction() != null && !call.systemInstruction().isBlank()) {
                    configBuilder.systemInstruction(Content.fromParts(Part.fromText(call.systemInstruction())));
                }

                if (props.gemini().temperature() != null && !props.gemini().temperature().isBlank()) {
                    try {
                        configBuilder.temperature(Float.parseFloat(props.gemini().temperature().trim()));
                    } catch (NumberFormatException ignored) {}
                }

                if (props.gemini().mediaResolution() != null && !props.gemini().mediaResolution().isBlank()) {
                    configBuilder.mediaResolution(props.gemini().mediaResolution());
                }

                // Build contents
                List<Part> sdkParts = new ArrayList<>();
                for (GeminiCall.PartInput partInput : call.parts()) {
                    if (partInput.isImage()) {
                        sdkParts.add(Part.fromBytes(partInput.imageBytes(), partInput.mimeType()));
                    } else if (partInput.isText()) {
                        sdkParts.add(Part.fromText(partInput.text()));
                    }
                }

                Content content = Content.fromParts(sdkParts.toArray(new Part[0]));

                // Invoke model
                GenerateContentResponse response = client.models.generateContent(
                        model,
                        content,
                        configBuilder.build()
                );

                long latency = System.currentTimeMillis() - startTime;
                String rawJson = response.text();

                // Validate JSON parsing into target schema
                if (call.responseSchemaClass() != null && rawJson != null) {
                    try {
                        objectMapper.readValue(rawJson, call.responseSchemaClass());
                    } catch (Exception parseEx) {
                        log.warn("JSON parse validation failed on attempt {} for key {}: {}",
                                attempt, cacheKey, parseEx.getMessage());
                        if (!parseRetryAttempted) {
                            parseRetryAttempted = true;
                            // Retry once on parse failure per spec
                            continue;
                        } else {
                            parseFailureCount.incrementAndGet();
                            log.error("Permanent JSON parse failure recorded for key {}. Raw text: {}",
                                    cacheKey, rawJson);
                        }
                    }
                }

                // Extract token metadata
                Long inputTokens = null;
                Long outputTokens = null;
                if (response.usageMetadata().isPresent()) {
                    var usage = response.usageMetadata().get();
                    if (usage.promptTokenCount().isPresent()) {
                        inputTokens = usage.promptTokenCount().get().longValue();
                    }
                    if (usage.candidatesTokenCount().isPresent()) {
                        outputTokens = usage.candidatesTokenCount().get().longValue();
                    }
                }

                String modelVersion = response.modelVersion().orElse(model);

                return new GeminiResult(
                        rawJson,
                        inputTokens,
                        outputTokens,
                        latency,
                        false,
                        modelVersion
                );

            } catch (Exception e) {
                boolean isRetryable = isRetryableError(e);
                log.warn("Gemini call attempt {}/{} failed (retryable={}): {}",
                        attempt, maxRetries, isRetryable, e.getMessage());

                if (attempt == maxRetries || !isRetryable) {
                    throw new RuntimeException("Gemini call failed after " + attempt + " attempts: " + e.getMessage(), e);
                }

                // Exponential backoff with jitter: 2^(attempt-1) * 500ms + random(0..250ms)
                long backoffMs = (1L << (attempt - 1)) * 500L + random.nextInt(250);
                try {
                    Thread.sleep(backoffMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Backoff interrupted", ie);
                }
            }
        }

        throw new IllegalStateException("Exhausted retries without result for key: " + cacheKey);
    }

    private boolean isRetryableError(Throwable t) {
        if (t instanceof ApiException apiEx) {
            int code = apiEx.code();
            return code == 429 || (code >= 500 && code < 600);
        }
        if (t instanceof IOException) {
            return true;
        }
        if (t.getCause() != null && t.getCause() != t) {
            return isRetryableError(t.getCause());
        }
        return false;
    }

    /**
     * Returns total JSON parse failure count.
     */
    public long getParseFailureCount() {
        return parseFailureCount.get();
    }
}
