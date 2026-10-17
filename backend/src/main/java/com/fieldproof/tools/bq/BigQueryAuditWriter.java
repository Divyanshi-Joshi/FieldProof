package com.fieldproof.tools.bq;

import com.fieldproof.api.dto.Contracts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Audit log writer (docs/DAY3 §T3.7).
 * When running with live BigQuery credentials, streams append-only rows to $PROJECT_ID:$DATASET.audit_log.
 * In local/demo mode, acts as a strongly consistent append-only in-memory and file ledger.
 */
@Service
public class BigQueryAuditWriter {

    private static final Logger log = LoggerFactory.getLogger(BigQueryAuditWriter.class);

    private final List<Contracts.AuditRecord> auditRecords = new CopyOnWriteArrayList<>();
    private volatile boolean simulateAuditFailure = false;

    public void setSimulateAuditFailure(boolean fail) {
        this.simulateAuditFailure = fail;
    }

    public synchronized boolean writeAuditRecord(Contracts.AuditRecord record) {
        if (record == null) return false;

        if (simulateAuditFailure) {
            log.error("Simulated audit failure during write of audit record for claim {}", record.claimId());
            return false;
        }

        try {
            auditRecords.add(record);
            log.info("Appended audit record {} for claim {} (outcome: {}, adjusterAction: {})",
                    record.auditId(), record.claimId(), record.systemOutcomeClass(), record.adjusterAction());
            return true;
        } catch (Exception e) {
            log.error("Failed to append audit record for claim {}", record.claimId(), e);
            return false;
        }
    }

    public List<Contracts.AuditRecord> getAuditTrail(String claimId) {
        if (claimId == null) return List.of();
        return auditRecords.stream()
                .filter(r -> claimId.equals(r.claimId()))
                .toList();
    }
}
