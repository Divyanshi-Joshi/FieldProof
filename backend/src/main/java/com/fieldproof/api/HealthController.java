package com.fieldproof.api;

import com.fieldproof.config.FieldProofProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lightweight health and connectivity endpoints for Cloud Run.
 * <p>
 * {@code /api/health} never calls Gemini — it is a pure liveness probe.
 * {@code /api/gemini/ping} proves the service account can reach Vertex AI.
 *
 * <p><b>TODO before submission:</b> remove or auth-gate {@code /api/gemini/ping}
 * (it is public on a public Cloud Run service).
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    /** Recorded once at class-load time so it survives restarts. */
    private static final Instant BUILD_TIME = Instant.now();

    private final FieldProofProperties props;

    public HealthController(FieldProofProperties props) {
        this.props = props;
    }

    // ── GET /api/health ──────────────────────────────────────────────────────

    /**
     * Pure liveness probe — never calls Gemini.
     * Returns the configured model and location so you can verify the
     * deployment environment at a glance.
     */
    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "UP");
        result.put("model", props.gemini().model());
        result.put("vertexLocation", props.gcp().vertexLocation());
        result.put("buildTime", BUILD_TIME.toString());
        return result;
    }
}
