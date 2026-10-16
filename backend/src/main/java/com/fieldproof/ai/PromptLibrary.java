package com.fieldproof.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Loads and caches versioned prompt templates from {@code src/main/resources/prompts/}
 * and allowed damage types from {@code config/label-map.yml}.
 */
@Component
public class PromptLibrary {

    private static final Logger log = LoggerFactory.getLogger(PromptLibrary.class);

    public static final String PROMPT_RAW_V0 = "grading_raw_v0";
    public static final String PROMPT_SIGNS_V1 = "grading_signs_v1";

    private final Map<String, String> templateCache = new ConcurrentHashMap<>();
    private final List<String> allowedDamageTypes;

    public PromptLibrary() {
        this.allowedDamageTypes = loadAllowedDamageTypes();
    }

    /**
     * Loads allowed damage types from {@code config/label-map.yml}.
     */
    @SuppressWarnings("unchecked")
    private List<String> loadAllowedDamageTypes() {
        try {
            ClassPathResource resource = new ClassPathResource("config/label-map.yml");
            if (resource.exists()) {
                ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
                try (InputStream is = resource.getInputStream()) {
                    Map<String, Object> data = yamlMapper.readValue(is, Map.class);
                    if (data != null && data.containsKey("allowed-damage-types")) {
                        Object list = data.get("allowed-damage-types");
                        if (list instanceof List<?> l) {
                            return l.stream().map(Object::toString).toList();
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not load config/label-map.yml: {}", e.getMessage());
        }
        return List.of("none", "other");
    }

    /**
     * Returns true if Person B has configured real damage types in label-map.yml
     * beyond the default placeholders ("none", "other").
     */
    public boolean isLabelMapConfigured() {
        if (allowedDamageTypes == null || allowedDamageTypes.isEmpty()) {
            return false;
        }
        // If it only contains "none" and "other", it has not been customized with real dataset classes
        List<String> placeholders = List.of("none", "other");
        return allowedDamageTypes.stream().anyMatch(t -> !placeholders.contains(t.toLowerCase().trim()));
    }

    /**
     * Returns the allowed damage types list from label-map.yml.
     */
    public List<String> getAllowedDamageTypes() {
        return allowedDamageTypes;
    }

    /**
     * Loads the raw prompt template for a given version.
     *
     * @param version identifier (e.g. "grading_signs_v1")
     * @return raw template text
     */
    public String getTemplate(String version) {
        return templateCache.computeIfAbsent(version, this::loadFromClasspath);
    }

    /**
     * Returns the formatted prompt text for the version, interpolating allowed damage types.
     */
    public String getFormattedPrompt(String version) {
        String template = getTemplate(version);
        if (PROMPT_SIGNS_V1.equals(version)) {
            String typesString = String.join(", ", allowedDamageTypes);
            return String.format(template, typesString);
        }
        return template;
    }

    private String loadFromClasspath(String version) {
        String path = "prompts/" + version + ".txt";
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            throw new IllegalArgumentException("Prompt template not found on classpath: " + path);
        }
        try (InputStream is = resource.getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8).trim();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read prompt template: " + path, e);
        }
    }
}
