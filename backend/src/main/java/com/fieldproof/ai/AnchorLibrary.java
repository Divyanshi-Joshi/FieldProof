package com.fieldproof.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * Loads and manages the 3 calibrated reference anchor photos (healthy, moderate, severe)
 * specified in {@code docs/DAY1_PERSON_A.md §T9} and {@code §O10}.
 * <p>
 * Anchor ordering is deterministically shuffled per pass using a seed derived from the pass number.
 */
@Component
public class AnchorLibrary {

    private static final Logger log = LoggerFactory.getLogger(AnchorLibrary.class);

    public record Anchor(String level, byte[] imageBytes, String fileName) {}

    private final Path anchorsJsonPath;
    private final ObjectMapper objectMapper;
    private final Map<String, Anchor> loadedAnchors = new LinkedHashMap<>();
    private boolean initialized = false;

    @Autowired
    public AnchorLibrary(ObjectMapper objectMapper) {
        this(Path.of("data/anchors/anchors.json"), objectMapper);
    }

    public AnchorLibrary(Path anchorsJsonPath, ObjectMapper objectMapper) {
        this.anchorsJsonPath = anchorsJsonPath;
        this.objectMapper = objectMapper;
        loadAnchorsIfPresent();
    }

    private synchronized void loadAnchorsIfPresent() {
        Path targetPath = anchorsJsonPath;
        if (!Files.exists(targetPath) && !targetPath.isAbsolute()) {
            Path altPath = Path.of("../").resolve(targetPath);
            if (Files.exists(altPath)) {
                targetPath = altPath;
            }
        }

        if (!Files.exists(targetPath)) {
            log.info("Anchors configuration not found at {}. Anchors will be inactive until O10 is completed.",
                    anchorsJsonPath);
            return;
        }

        try {
            List<Map<String, String>> entries = objectMapper.readValue(
                    targetPath.toFile(),
                    new TypeReference<>() {}
            );

            for (Map<String, String> entry : entries) {
                String level = entry.get("level");
                String filePath = entry.get("file");
                if (level != null && filePath != null) {
                    Path imgPath = Path.of(filePath);
                    if (!Files.exists(imgPath)) {
                        // Try resolving relative to anchors folder
                        Path parent = targetPath.getParent();
                        imgPath = parent != null ? parent.resolve(filePath) : Path.of(filePath);
                    }
                    if (Files.exists(imgPath)) {
                        byte[] bytes = Files.readAllBytes(imgPath);
                        loadedAnchors.put(level.toLowerCase().trim(), new Anchor(level.toLowerCase().trim(), bytes, imgPath.getFileName().toString()));
                    } else {
                        log.warn("Anchor image file not found: {}", filePath);
                    }
                }
            }

            initialized = loadedAnchors.containsKey("healthy")
                    && loadedAnchors.containsKey("moderate")
                    && loadedAnchors.containsKey("severe");

            if (initialized) {
                log.info("AnchorLibrary successfully loaded 3 reference anchors (healthy, moderate, severe).");
            } else {
                log.warn("AnchorLibrary partially loaded {} anchors. Need healthy, moderate, and severe.", loadedAnchors.size());
            }

        } catch (Exception e) {
            log.error("Failed to load anchors from {}: {}", anchorsJsonPath, e.getMessage());
        }
    }

    /**
     * Manually registers anchors (useful for tests or runtime configuration).
     */
    public synchronized void registerAnchor(String level, byte[] bytes, String fileName) {
        loadedAnchors.put(level.toLowerCase().trim(), new Anchor(level.toLowerCase().trim(), bytes, fileName));
        initialized = loadedAnchors.containsKey("healthy")
                && loadedAnchors.containsKey("moderate")
                && loadedAnchors.containsKey("severe");
    }

    public boolean isAvailable() {
        return initialized && loadedAnchors.size() >= 3;
    }

    /**
     * Returns the 3 anchor photos shuffled deterministically by pass index.
     *
     * @param pass pass index (1 or 2)
     * @return shuffled list of the 3 reference anchors
     */
    public List<Anchor> getAnchorsShuffled(int pass) {
        if (!isAvailable()) {
            throw new IllegalStateException("Anchors are not fully loaded. Require healthy, moderate, and severe in " + anchorsJsonPath);
        }

        List<Anchor> list = new ArrayList<>();
        list.add(loadedAnchors.get("healthy"));
        list.add(loadedAnchors.get("moderate"));
        list.add(loadedAnchors.get("severe"));

        // Deterministic shuffle seed derived from pass number
        long seed = (long) pass * 31_337L + 7_919L;
        Collections.shuffle(list, new Random(seed));

        return Collections.unmodifiableList(list);
    }

    /**
     * Returns a comma-separated string of anchor levels in order, e.g. "moderate,healthy,severe".
     */
    public static String getAnchorOrderString(List<Anchor> anchors) {
        if (anchors == null || anchors.isEmpty()) {
            return "none";
        }
        List<String> levels = new ArrayList<>();
        for (Anchor a : anchors) {
            levels.add(a.level());
        }
        return String.join(",", levels);
    }
}
