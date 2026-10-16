package com.fieldproof.api;

import com.fieldproof.config.FieldProofProperties;
import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Temporary endpoint that proves the Cloud Run service account can reach
 * Vertex AI / Gemini.
 *
 * <p><b>⚠ REMOVE THIS ENTIRE FILE BEFORE SUBMISSION.</b>
 * It is public on a public Cloud Run service and exists only
 * for Gate 1 verification (see {@code docs/DAY1_PERSON_A.md §T3}).
 */
@RestController
@RequestMapping("/api/gemini")
public class GeminiPingController {

    private static final Logger log = LoggerFactory.getLogger(GeminiPingController.class);

    private final FieldProofProperties props;

    public GeminiPingController(FieldProofProperties props) {
        this.props = props;
    }

    /**
     * Sends {@code "Reply with the single word OK"} to the configured Gemini
     * model via Vertex AI and returns the response text plus latency.
     */
    @GetMapping("/ping")
    public ResponseEntity<Map<String, Object>> ping() {
        Map<String, Object> result = new LinkedHashMap<>();
        long startNanos = System.nanoTime();

        try {
            Client client = Client.builder()
                    .vertexAI(true)
                    .project(props.gcp().projectId())
                    .location(props.gcp().vertexLocation())
                    .build();

            GenerateContentResponse response = client.models.generateContent(
                    props.gemini().model(),
                    "Reply with the single word OK",
                    GenerateContentConfig.builder().build()
            );

            long latencyMs = (System.nanoTime() - startNanos) / 1_000_000;

            String text = response.text();

            result.put("status", "OK");
            result.put("response", text != null ? text.trim() : "(null)");
            result.put("model", props.gemini().model());
            result.put("vertexLocation", props.gcp().vertexLocation());
            result.put("latencyMs", latencyMs);

            log.info("Gemini ping OK — model={}, latency={}ms, response='{}'",
                    props.gemini().model(), latencyMs, text);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            long latencyMs = (System.nanoTime() - startNanos) / 1_000_000;

            result.put("status", "ERROR");
            result.put("error", e.getClass().getSimpleName() + ": " + e.getMessage());
            result.put("model", props.gemini().model());
            result.put("vertexLocation", props.gcp().vertexLocation());
            result.put("latencyMs", latencyMs);

            log.error("Gemini ping FAILED — model={}, latency={}ms",
                    props.gemini().model(), latencyMs, e);

            return ResponseEntity.internalServerError().body(result);
        }
    }
}
