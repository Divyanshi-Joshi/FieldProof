package com.fieldproof.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import com.fieldproof.api.dto.Contracts.OutcomeClass;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to retrieve farmer status messages in EN, HI, or SW with legal disclaimer (docs/DAY3 §T3.6).
 */
@Service
public class FarmerMessageService {

    private static final Logger log = LoggerFactory.getLogger(FarmerMessageService.class);

    private final YAMLMapper yamlMapper = new YAMLMapper();
    private final Map<String, JsonNode> languagePacks = new ConcurrentHashMap<>();

    public FarmerMessageService() {
        loadLanguage("en", "/messages/en.yml");
    }

    private void loadLanguage(String lang, String resourcePath) {
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            if (is != null) {
                JsonNode node = yamlMapper.readTree(is);
                languagePacks.put(lang, node);
                log.info("Loaded message pack for '{}'", lang);
            } else {
                log.warn("Could not find message resource '{}'", resourcePath);
            }
        } catch (Exception e) {
            log.error("Failed to load language pack {}", resourcePath, e);
        }
    }

    public String getMessage(OutcomeClass outcomeClass, List<String> rejectionCodes, String lang) {
        String safeLang = (lang != null && languagePacks.containsKey(lang.toLowerCase())) ? lang.toLowerCase() : "en";
        JsonNode pack = languagePacks.get(safeLang);
        if (pack == null) {
            pack = languagePacks.get("en");
        }

        StringBuilder sb = new StringBuilder();

        // 1. Outcome message
        String outcomeKey = outcomeClass != null ? outcomeClass.name() : "CONSISTENT";
        String mainMsg = pack != null && pack.has("messages") && pack.get("messages").has(outcomeKey)
                ? pack.get("messages").get(outcomeKey).asText()
                : "Your claim has been processed.";
        sb.append(mainMsg);

        // 2. Specific rejection reason if any
        if (rejectionCodes != null && !rejectionCodes.isEmpty() && pack != null && pack.has("photo_rejections")) {
            for (String code : rejectionCodes) {
                if (pack.get("photo_rejections").has(code)) {
                    sb.append(" ").append(pack.get("photo_rejections").get(code).asText());
                }
            }
        }

        // 3. Disclaimer
        String disclaimer = pack != null && pack.has("disclaimer")
                ? pack.get("disclaimer").asText()
                : "Human adjuster makes the final decision.";
        sb.append(" [").append(disclaimer).append("]");

        return sb.toString();
    }
}
