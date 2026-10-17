package com.fieldproof.tools.bq;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.config.FieldProofProperties;
import com.google.cloud.bigquery.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Audit log writer (docs/DAY3 §T3.7).
 *
 * <p>In production (Cloud Run), streams append-only rows into BigQuery:
 * {@code $PROJECT_ID.$FIELDPROOF_BQ_DATASET.$FIELDPROOF_BQ_TABLE}
 * (defaults: dataset=fieldproof_audit, table=audit_log).
 *
 * <p>Falls back gracefully to an in-memory ledger when BigQuery credentials
 * are unavailable (local dev / unit tests), logging a clear warning on startup.
 */
@Service
public class BigQueryAuditWriter {

    private static final Logger log = LoggerFactory.getLogger(BigQueryAuditWriter.class);

    // ── In-memory fallback ledger ─────────────────────────────────────────────

    private final List<Contracts.AuditRecord> memoryLedger = new CopyOnWriteArrayList<>();
    private volatile boolean simulateAuditFailure = false;

    // ── BigQuery client & config ──────────────────────────────────────────────

    private final FieldProofProperties props;
    private final String bqDataset;
    private final String bqTable;

    /** Set to {@code true} only when the BQ client initialised successfully. */
    private volatile boolean bqEnabled = false;
    private BigQuery bigQuery;
    private TableId tableId;

    // ─────────────────────────────────────────────────────────────────────────

    @Autowired
    public BigQueryAuditWriter(
            FieldProofProperties props,
            @Value("${fieldproof.bq.dataset:fieldproof_audit}") String bqDataset,
            @Value("${fieldproof.bq.table:audit_log}") String bqTable) {
        this.props = props;
        this.bqDataset = bqDataset;
        this.bqTable   = bqTable;
    }

    /** No-arg constructor for non-Spring contexts (unit tests, ClaimService self-new). */
    public BigQueryAuditWriter() {
        this.props     = null;
        this.bqDataset = "fieldproof_audit";
        this.bqTable   = "audit_log";
    }

    // ─────────────────────────────────────────────────────────────────────────

    @PostConstruct
    public void init() {
        if (props == null || isBlank(props.gcp().projectId())
                || "fieldproof-prod".equals(props.gcp().projectId())) {
            // No real project configured — stay in memory-only mode
            log.warn("BigQueryAuditWriter: no real GCP project configured — using in-memory ledger only");
            return;
        }
        tryInitBigQuery(props.gcp().projectId());
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Writes an audit record.
     *
     * <p>When BigQuery is available, inserts the row via streaming insertAll.
     * Always appends to the in-memory ledger regardless of BQ outcome,
     * so {@link #getAuditTrail} works in all environments.
     *
     * @return {@code true} if the record was persisted (BQ or memory); {@code false} on failure
     */
    public synchronized boolean writeAuditRecord(Contracts.AuditRecord record) {
        if (record == null) return false;

        if (simulateAuditFailure) {
            log.error("Simulated audit failure for claim {}", record.claimId());
            return false;
        }

        // Always update in-memory ledger first (source of truth for this instance)
        memoryLedger.add(record);

        if (bqEnabled) {
            return insertToBigQuery(record);
        } else {
            log.info("Appended audit record {} for claim {} (outcome: {}, adjusterAction: {}) [in-memory only]",
                    record.auditId(), record.claimId(), record.systemOutcomeClass(), record.adjusterAction());
            return true;
        }
    }

    public List<Contracts.AuditRecord> getAuditTrail(String claimId) {
        if (claimId == null) return List.of();
        return memoryLedger.stream()
                .filter(r -> claimId.equals(r.claimId()))
                .toList();
    }

    /** For integration tests only. */
    public void setSimulateAuditFailure(boolean fail) {
        this.simulateAuditFailure = fail;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void tryInitBigQuery(String projectId) {
        try {
            bigQuery = BigQueryOptions.newBuilder()
                    .setProjectId(projectId)
                    .build()
                    .getService();

            tableId = TableId.of(projectId, bqDataset, bqTable);
            ensureTableExists(projectId);

            bqEnabled = true;
            log.info("BigQueryAuditWriter: connected → {}.{}.{}", projectId, bqDataset, bqTable);
        } catch (Exception e) {
            log.warn("BigQueryAuditWriter: could not initialise BQ client (falling back to in-memory): {}",
                    e.getMessage());
        }
    }

    private void ensureTableExists(String projectId) {
        Dataset ds = bigQuery.getDataset(DatasetId.of(projectId, bqDataset));
        if (ds == null) {
            bigQuery.create(DatasetInfo.newBuilder(DatasetId.of(projectId, bqDataset)).build());
            log.info("BigQueryAuditWriter: created dataset {}.{}", projectId, bqDataset);
        }

        Table table = bigQuery.getTable(tableId);
        if (table == null) {
            Schema schema = Schema.of(
                    Field.of("audit_id",                    StandardSQLTypeName.STRING),
                    Field.of("claim_id",                    StandardSQLTypeName.STRING),
                    Field.of("plot_id",                     StandardSQLTypeName.STRING),
                    Field.of("timestamp_utc",               StandardSQLTypeName.TIMESTAMP),
                    Field.of("model_version",               StandardSQLTypeName.STRING),
                    Field.of("prompt_version",              StandardSQLTypeName.STRING),
                    Field.of("frozen_protocol_commit_hash", StandardSQLTypeName.STRING),
                    Field.of("evidence_timestamp_utc",      StandardSQLTypeName.TIMESTAMP),
                    Field.of("cache_hit",                   StandardSQLTypeName.BOOL),
                    Field.of("system_outcome_class",        StandardSQLTypeName.STRING),
                    Field.of("system_recommended_action",   StandardSQLTypeName.STRING),
                    Field.of("adjuster_id",                 StandardSQLTypeName.STRING),
                    Field.of("adjuster_action",             StandardSQLTypeName.STRING),
                    Field.of("adjuster_notes",              StandardSQLTypeName.STRING),
                    Field.of("decided_at_utc",              StandardSQLTypeName.TIMESTAMP)
            );
            bigQuery.create(TableInfo.of(tableId, StandardTableDefinition.of(schema)));
            log.info("BigQueryAuditWriter: created table {}", tableId);
        }
    }

    private boolean insertToBigQuery(Contracts.AuditRecord r) {
        try {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("audit_id",                    r.auditId());
            row.put("claim_id",                    r.claimId());
            row.put("plot_id",                     r.plotId());
            row.put("timestamp_utc",               toEpochMicros(r.timestampUtc()));
            row.put("model_version",               r.modelVersion());
            row.put("prompt_version",              r.promptVersion());
            row.put("frozen_protocol_commit_hash", r.frozenProtocolCommitHash());
            row.put("evidence_timestamp_utc",      toEpochMicros(r.evidenceTimestampUtc()));
            row.put("cache_hit",                   r.cacheHit());
            row.put("system_outcome_class",        r.systemOutcomeClass() != null ? r.systemOutcomeClass().name() : null);
            row.put("system_recommended_action",   r.systemRecommendedAction() != null ? r.systemRecommendedAction().name() : null);
            row.put("adjuster_id",                 r.adjusterId());
            row.put("adjuster_action",             r.adjusterAction() != null ? r.adjusterAction().name() : null);
            row.put("adjuster_notes",              r.adjusterNotes());
            row.put("decided_at_utc",              toEpochMicros(r.decidedAtUtc()));

            InsertAllRequest request = InsertAllRequest.newBuilder(tableId)
                    .addRow(r.auditId(), row)
                    .build();

            InsertAllResponse response = bigQuery.insertAll(request);
            if (response.hasErrors()) {
                log.error("BigQueryAuditWriter: insertion errors for {}: {}", r.auditId(), response.getInsertErrors());
                return false;
            }
            log.info("BigQueryAuditWriter: wrote audit record {} for claim {} → BQ",
                    r.auditId(), r.claimId());
            return true;
        } catch (Exception e) {
            log.error("BigQueryAuditWriter: failed to insert audit record {} — falling back to memory only: {}",
                    r.auditId(), e.getMessage());
            return false;
        }
    }

    private static Long toEpochMicros(Instant instant) {
        if (instant == null) return null;
        return instant.getEpochSecond() * 1_000_000L + instant.getNano() / 1000L;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
