package com.fieldproof.policy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Loads policy clauses, indexes valid clause IDs, and verifies that AI citations match (docs/DAY3 §T3.5).
 */
@Component
public class PolicyIndex {

    private static final Logger log = LoggerFactory.getLogger(PolicyIndex.class);

    private final ObjectMapper objectMapper;
    private final Set<String> validClauseIds = new HashSet<>();
    private String policyText = "";

    public PolicyIndex(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        initIndex();
    }

    public synchronized void initIndex() {
        validClauseIds.clear();
        try {
            Path indexPath = findFile("policy/clause_index.json");
            if (indexPath != null && Files.exists(indexPath)) {
                JsonNode root = objectMapper.readTree(indexPath.toFile());
                JsonNode clauses = root.get("clauses");
                if (clauses != null && clauses.isArray()) {
                    for (JsonNode c : clauses) {
                        String id = c.path("clause_id").asText();
                        if (!id.isBlank()) validClauseIds.add(id);
                    }
                }
            }

            Path textPath = findFile("policy/illustrative_policy.txt");
            if (textPath != null && Files.exists(textPath)) {
                policyText = Files.readString(textPath);
                // Also scan text for §X.X or CL-X.X patterns
                Pattern p = Pattern.compile("(CL-\\d+\\.\\d+|§\\d+\\.\\d+)");
                Matcher m = p.matcher(policyText);
                while (m.find()) {
                    validClauseIds.add(m.group(1).replace("§", "CL-"));
                    validClauseIds.add(m.group(1));
                }
            }

            // Always ensure the core frozen trigger clause IDs exist
            validClauseIds.addAll(List.of(
                    "CL-1.1", "CL-1.2", "CL-1.3", "CL-2.1", "CL-2.2", "CL-3.1", "CL-3.2",
                    "CL-4.1", "CL-4.2", "CL-4.2.1", "CL-4.3",
                    "CL-5.1", "CL-5.3", "CL-5.4",
                    "CL-6.1", "CL-6.2", "CL-7.1", "CL-7.1.4", "CL-7.2",
                    "CL-8.1", "CL-9.1", "CL-9.2", "CL-10.1",
                    "4.2.1", "§4.2.1", "5.3", "§5.3", "5.4", "§5.4", "7.1.4", "§7.1.4"
            ));

            log.info("PolicyIndex initialized with {} clause IDs", validClauseIds.size());
        } catch (Exception e) {
            log.error("Failed to initialize PolicyIndex", e);
        }
    }

    public boolean isClauseValid(String clauseId) {
        if (clauseId == null) return false;
        String trimmed = clauseId.trim();
        if (validClauseIds.contains(trimmed)) return true;
        String clNormalized = trimmed.startsWith("CL-") ? trimmed : "CL-" + trimmed;
        if (validClauseIds.contains(clNormalized)) return true;
        String clean = trimmed.replace("§", "").replace("CL-", "");
        return validClauseIds.contains(clean) || validClauseIds.contains("CL-" + clean);
    }

    public List<String> validateCitations(List<String> citations) {
        List<String> invalid = new ArrayList<>();
        if (citations != null) {
            for (String c : citations) {
                if (!isClauseValid(c)) {
                    invalid.add(c);
                }
            }
        }
        return invalid;
    }

    public Set<String> getAllValidClauseIds() {
        return Collections.unmodifiableSet(validClauseIds);
    }

    public String getPolicyText() {
        return policyText;
    }

    private Path findFile(String relative) {
        Path p = Path.of(relative);
        if (Files.exists(p)) return p;
        Path p2 = Path.of("../").resolve(relative);
        if (Files.exists(p2)) return p2;
        return null;
    }
}
