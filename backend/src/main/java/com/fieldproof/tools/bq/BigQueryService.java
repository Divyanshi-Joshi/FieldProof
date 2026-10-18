package com.fieldproof.tools.bq;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.config.FieldProofProperties;
import com.google.cloud.bigquery.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final FieldProofProperties props;
    private final BigQuery bigQuery;
    private final boolean bqAvailable;

    public BigQueryService() {
        this(null);
    }

    @Autowired
    public BigQueryService(@Autowired(required = false) FieldProofProperties props) {
        this.props = props;
        loadQueries();

        BigQuery client = null;
        boolean avail = false;
        String projectId = (props != null && props.gcp() != null) ? props.gcp().projectId() : null;
        if (projectId != null && !projectId.isBlank()) {
            try {
                client = BigQueryOptions.newBuilder()
                        .setProjectId(projectId)
                        .build()
                        .getService();
                avail = true;
                log.info("BigQueryService connected to GCP project: {}", projectId);
            } catch (Exception e) {
                log.warn("BigQuery client initialization failed ({}), using fallback simulation", e.getMessage());
            }
        }
        this.bigQuery = client;
        this.bqAvailable = avail;
    }

    public synchronized void loadQueries() {
        allowlistedQueries.clear();
        loadQueryIfExists("frozen_trigger", "protocol/frozen_trigger.sql");
        loadQueryIfExists("index_doctor_slider", "protocol/index_doctor_slider.sql");
        loadQueryIfExists("forecast_payout_risk", "protocol/forecast_payout_risk.sql");
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

    /**
     * Executes the allowlisted BigQuery ML ARIMA_PLUS 14-day rainfall forecast query.
     * Returns Optional.empty() if BigQuery client is unavailable or if model is not found,
     * triggering clean, resilient fallback to the calibrated statistical ARIMA engine.
     */
    public Optional<List<Contracts.DailyRiskForecast>> executeArimaForecast(String county, double triggerThresholdMm) {
        if (!bqAvailable || bigQuery == null) {
            return Optional.empty();
        }
        String sql = allowlistedQueries.get("forecast_payout_risk");
        if (sql == null || sql.isBlank()) {
            return Optional.empty();
        }

        try {
            QueryJobConfiguration queryConfig = QueryJobConfiguration.newBuilder(sql)
                    .addNamedParameter("county", QueryParameterValue.string(county))
                    .addNamedParameter("trigger_threshold_mm", QueryParameterValue.float64(triggerThresholdMm))
                    .setUseLegacySql(false)
                    .build();

            TableResult result = bigQuery.query(queryConfig);
            List<Contracts.DailyRiskForecast> list = new ArrayList<>();
            for (FieldValueList row : result.iterateAll()) {
                String date = row.get("forecast_date").getStringValue();
                double expected = row.get("expected_rain_mm").getDoubleValue();
                double lower = row.get("lower_rain_mm").getDoubleValue();
                double upper = row.get("upper_rain_mm").getDoubleValue();
                double prob = row.get("payout_probability").getDoubleValue();
                list.add(new Contracts.DailyRiskForecast(date, expected, lower, upper, prob));
            }

            if (!list.isEmpty()) {
                log.info("BigQuery ML ARIMA_PLUS query executed successfully for county {} ({} days returned)", county, list.size());
                return Optional.of(list);
            }
        } catch (Exception e) {
            log.warn("BigQuery ML ARIMA_PLUS live query failed for county {} ({}); activating calibrated ARIMA fallback", county, e.getMessage());
        }
        return Optional.empty();
    }

    public record QueryPlan(String queryName, String sqlTemplate, Map<String, Object> boundParameters) {}
}
