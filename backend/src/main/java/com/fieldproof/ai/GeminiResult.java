package com.fieldproof.ai;

/**
 * Result returned by {@link GeminiGateway#generate(GeminiCall)}.
 *
 * @param json         raw JSON text returned by the model or loaded from cache
 * @param inputTokens  number of prompt/input tokens (or null if not reported)
 * @param outputTokens number of candidate/output tokens (or null if not reported)
 * @param latencyMs    round-trip execution latency in milliseconds (0 for cache hits)
 * @param fromCache    true if the response was served from the local disk cache
 * @param modelVersion model version string reported by the API or cache
 */
public record GeminiResult(
        String json,
        Long inputTokens,
        Long outputTokens,
        long latencyMs,
        boolean fromCache,
        String modelVersion
) {}
