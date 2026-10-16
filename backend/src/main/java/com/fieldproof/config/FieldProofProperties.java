package com.fieldproof.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Type-safe configuration properties bound from {@code application.yml}
 * under the {@code fieldproof.*} prefix.
 * <p>
 * Every value is overridable by the corresponding {@code FIELDPROOF_*}
 * environment variable.  See {@code GEMINI.md} and
 * {@code docs/DAY1_PERSON_A.md §T2} for the full mapping table.
 *
 * @param gcp     GCP project and Vertex AI location settings
 * @param gemini  Gemini model and call-tuning settings
 * @param pricing optional per-million token prices (for cost reporting)
 * @param cache   response-cache directory settings
 */
@ConfigurationProperties(prefix = "fieldproof")
public record FieldProofProperties(
        Gcp gcp,
        Gemini gemini,
        Pricing pricing,
        Cache cache
) {

    // ── Nested records ───────────────────────────────────────────────────────

    /**
     * @param projectId      GCP project ID (required)
     * @param vertexLocation Vertex AI location, e.g. {@code global} or {@code asia-south1} (required)
     */
    public record Gcp(
            String projectId,
            String vertexLocation
    ) {}

    /**
     * @param model          Gemini model ID, e.g. {@code gemini-3-flash-preview} (required)
     * @param temperature    sampling temperature; {@code null} means use model default
     * @param thinkingLevel  thinking-level setting for Gemini 3; {@code null} means default
     * @param mediaResolution media-resolution setting for image inputs; {@code null} means default
     * @param maxConcurrency maximum concurrent Gemini calls (default 4)
     * @param maxRetries     maximum retries on 429/5xx with exponential backoff (default 4)
     */
    public record Gemini(
            String model,
            String temperature,
            String thinkingLevel,
            String mediaResolution,
            int maxConcurrency,
            int maxRetries
    ) {}

    /**
     * Optional pricing for cost-per-image reporting.
     * If either value is {@code null}, report tokens only — never hard-code prices.
     *
     * @param inputPerMillion  cost per million input tokens (nullable)
     * @param outputPerMillion cost per million output tokens (nullable)
     */
    public record Pricing(
            String inputPerMillion,
            String outputPerMillion
    ) {}

    /**
     * @param dir directory for SHA-256-keyed JSON response cache files (default {@code cache/})
     */
    public record Cache(
            String dir
    ) {}
}
