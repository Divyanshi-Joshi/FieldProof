package com.fieldproof.policy;

import com.fieldproof.api.dto.Contracts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class BriefGuardTest {

    private PolicyIndex policyIndex;
    private BriefGuard briefGuard;

    @BeforeEach
    void setUp() {
        policyIndex = new PolicyIndex(new ObjectMapper());
        briefGuard = new BriefGuard(policyIndex);
    }

    @Test
    void testValidBriefWithKnownClauses() {
        Contracts.EvidenceRecord ev = new Contracts.EvidenceRecord(
                "P-0142", "Makueni", "2025-LR", "maize",
                Contracts.CriticalGrowthStage.flowering,
                341, 290, 30, false, true,
                21, java.time.LocalDate.parse("2025-03-12"), java.time.LocalDate.parse("2025-04-01"), true,
                0.31, 0.52, -1.9, -1.5, true,
                Contracts.EvidenceSource.BIGQUERY_DATASET, java.time.Instant.now()
        );

        BriefGuard.BriefValidationResult res = briefGuard.validateBrief(
                "Drought stress observed during flowering. Recommend escalation under CL-4.2.",
                List.of("CL-4.2"),
                ev
        );

        assertTrue(res.valid());
        assertEquals(0, res.violations().size());
        assertTrue(res.sanitizedBrief().contains("CL-4.2"));
    }

    @Test
    void testRejectsUnknownClauseAndFallbacks() {
        Contracts.EvidenceRecord ev = new Contracts.EvidenceRecord(
                "P-0142", "Makueni", "2025-LR", "maize",
                Contracts.CriticalGrowthStage.flowering,
                341, 290, 30, false, true,
                21, java.time.LocalDate.parse("2025-03-12"), java.time.LocalDate.parse("2025-04-01"), true,
                0.31, 0.52, -1.9, -1.5, true,
                Contracts.EvidenceSource.BIGQUERY_DATASET, java.time.Instant.now()
        );

        BriefGuard.BriefValidationResult res = briefGuard.validateBrief(
                "Recommend payout under fabricated clause CL-99.99.",
                List.of("CL-99.99"),
                ev
        );

        assertFalse(res.valid());
        assertTrue(res.violations().get(0).contains("Invalid clause citations"));
        assertTrue(res.sanitizedBrief().contains("Deterministic Brief for Plot P-0142"));
    }

    @Test
    void testRejectsAuthoritativePaymentPromise() {
        Contracts.EvidenceRecord ev = new Contracts.EvidenceRecord(
                "P-0142", "Makueni", "2025-LR", "maize",
                Contracts.CriticalGrowthStage.flowering,
                341, 290, 30, false, true,
                21, java.time.LocalDate.parse("2025-03-12"), java.time.LocalDate.parse("2025-04-01"), true,
                0.31, 0.52, -1.9, -1.5, true,
                Contracts.EvidenceSource.BIGQUERY_DATASET, java.time.Instant.now()
        );

        BriefGuard.BriefValidationResult res = briefGuard.validateBrief(
                "The insurer will pay $500 immediately for this claim.",
                List.of("CL-2.1"),
                ev
        );

        assertFalse(res.valid());
        assertTrue(res.violations().stream().anyMatch(v -> v.contains("payment promises")));
        assertTrue(res.sanitizedBrief().contains("Deterministic Brief"));
    }
}
