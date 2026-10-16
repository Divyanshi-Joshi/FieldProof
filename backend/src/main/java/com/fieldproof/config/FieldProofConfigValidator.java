package com.fieldproof.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates required {@link FieldProofProperties} at startup and fails fast
 * with a clear, actionable message if any required value is missing.
 * <p>
 * Required values (from {@code GEMINI.md} and {@code docs/DAY1_PERSON_A.md §T2}):
 * <ul>
 *     <li>{@code FIELDPROOF_GCP_PROJECT} → {@code fieldproof.gcp.project-id}</li>
 *     <li>{@code FIELDPROOF_VERTEX_LOCATION} → {@code fieldproof.gcp.vertex-location}</li>
 *     <li>{@code FIELDPROOF_GEMINI_MODEL} → {@code fieldproof.gemini.model}</li>
 * </ul>
 */
@Component
public class FieldProofConfigValidator {

    private static final Logger log = LoggerFactory.getLogger(FieldProofConfigValidator.class);

    private final FieldProofProperties props;

    public FieldProofConfigValidator(FieldProofProperties props) {
        this.props = props;
        // Validate immediately during construction (before any bean uses these values)
        validate();
    }

    private void validate() {
        List<String> missing = new ArrayList<>();

        if (isBlank(props.gcp().projectId())) {
            missing.add("fieldproof.gcp.project-id  (env: FIELDPROOF_GCP_PROJECT)");
        }
        if (isBlank(props.gcp().vertexLocation())) {
            missing.add("fieldproof.gcp.vertex-location  (env: FIELDPROOF_VERTEX_LOCATION)");
        }
        if (isBlank(props.gemini().model())) {
            missing.add("fieldproof.gemini.model  (env: FIELDPROOF_GEMINI_MODEL)");
        }

        if (!missing.isEmpty()) {
            String message = """
                    
                    ╔══════════════════════════════════════════════════════════════╗
                    ║  FieldProof — REQUIRED CONFIGURATION MISSING                ║
                    ╚══════════════════════════════════════════════════════════════╝
                    
                    The following required properties are not set:
                    
                    %s
                    
                    Set them in application.yml or as environment variables.
                    Example:
                      export FIELDPROOF_GCP_PROJECT=my-project-id
                      export FIELDPROOF_VERTEX_LOCATION=global
                      export FIELDPROOF_GEMINI_MODEL=gemini-3-flash-preview
                    
                    """.formatted(String.join("\n  ", missing));
            throw new IllegalStateException(message);
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logConfig() {
        log.info("FieldProof config validated — project={}, location={}, model={}",
                props.gcp().projectId(),
                props.gcp().vertexLocation(),
                props.gemini().model());

        if (props.gemini().temperature() != null) {
            log.info("  temperature={}", props.gemini().temperature());
        }
        if (props.gemini().thinkingLevel() != null) {
            log.info("  thinking-level={}", props.gemini().thinkingLevel());
        }
        if (props.gemini().mediaResolution() != null) {
            log.info("  media-resolution={}", props.gemini().mediaResolution());
        }
        log.info("  max-concurrency={}, max-retries={}",
                props.gemini().maxConcurrency(), props.gemini().maxRetries());

        if (props.pricing() != null
                && props.pricing().inputPerMillion() != null
                && props.pricing().outputPerMillion() != null) {
            log.info("  pricing: input={}/M, output={}/M",
                    props.pricing().inputPerMillion(), props.pricing().outputPerMillion());
        } else {
            log.info("  pricing: not configured — will report tokens only");
        }
        log.info("  cache dir={}", props.cache() != null ? props.cache().dir() : "cache/");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
