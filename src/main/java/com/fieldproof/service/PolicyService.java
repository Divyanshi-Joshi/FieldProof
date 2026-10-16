package com.fieldproof.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.util.*;

@Service
public class PolicyService {

    private static final Logger log = LoggerFactory.getLogger(PolicyService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    private JsonNode clauseIndexJson;
    private String policyText = "";

    @PostConstruct
    public void init() {
        try {
            File indexFile = new File("policy/clause_index.json");
            if (!indexFile.exists()) {
                indexFile = new File("../policy/clause_index.json");
            }
            if (indexFile.exists()) {
                clauseIndexJson = objectMapper.readTree(indexFile);
            }

            File textFile = new File("policy/illustrative_policy.txt");
            if (!textFile.exists()) {
                textFile = new File("../policy/illustrative_policy.txt");
            }
            if (textFile.exists()) {
                policyText = Files.readString(textFile.toPath());
            }
            log.info("Loaded policy documents: index exists={}, textLength={}", clauseIndexJson != null, policyText.length());
        } catch (Exception e) {
            log.error("Failed to load policy files", e);
        }
    }

    public JsonNode getClauseIndex() {
        return clauseIndexJson != null ? clauseIndexJson : objectMapper.createObjectNode();
    }

    public Map<String, Object> getPolicyTextResponse() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("policy_ref", "FP-DEMO-2026-001");
        resp.put("title", "FieldProof Illustrative Agricultural Weather-Index Insurance Policy");
        resp.put("full_text", policyText);
        return resp;
    }
}
