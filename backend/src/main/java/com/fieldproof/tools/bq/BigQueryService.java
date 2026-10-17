package com.fieldproof.tools.bq;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to execute allowlisted named queries only (docs/DAY2 §T2.5).
 * Strictly forbids arbitrary raw SQL string concatenation.
 */
@Service
public class BigQueryService {

    private static final Logger log = LoggerFactory.getLogger(BigQueryService.class);

    private final Map<String, String> allowlistedQueries = new ConcurrentHashMap<>();

    public BigQueryService() {
        loadQueries();
    }

    public synchronized void loadQueries() {
        allowlistedQueries.clear();
        loadQueryIfExists("frozen_trigger", "protocol/frozen_trigger.sql");
        loadQueryIfExists("index_doctor_slider", "protocol/index_doctor_slider.sql");
    }

    private void loadQueryIfExists(String name, String pathStr) {
        try {
            Path p = Path.of(pathStr);
            if (!Files.exists(p)) p = Path.of("../").resolve(pathStr);
            if (Files.exists(p)) {
                String sql = Files.readString(p);
                allowlistedQueries.put(name, sql);
                log.info("Loaded allowlisted query '{}' from {}", name, p);
            }
        } catch (Exception e) {
            log.warn("Could not load query file {}: {}", pathStr, e.getMessage());
        }
    }

    public boolean isQueryAllowed(String queryName) {
        return allowlistedQueries.containsKey(queryName);
    }

    public QueryPlan prepareNamedQuery(String queryName, Map<String, Object> parameters) {
        if (!allowlistedQueries.containsKey(queryName)) {
            throw new IllegalArgumentException("Query name '" + queryName + "' is not in the allowlist. Available: " + allowlistedQueries.keySet());
        }
        String sqlTemplate = allowlistedQueries.get(queryName);
        return new QueryPlan(queryName, sqlTemplate, Collections.unmodifiableMap(parameters != null ? parameters : Map.of()));
    }

    public record QueryPlan(String queryName, String sqlTemplate, Map<String, Object> boundParameters) {}
}
