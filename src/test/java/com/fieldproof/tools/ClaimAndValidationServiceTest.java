package com.fieldproof.tools;

import com.fieldproof.api.dto.ClaimBundle;
import com.fieldproof.api.dto.Contracts;
import com.fieldproof.service.ClaimService;
import com.fieldproof.service.PolicyService;
import com.fieldproof.service.ValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Claim, Policy, and Validation Backend Services Test")
public class ClaimAndValidationServiceTest {

    private ClaimService claimService;
    private ValidationService validationService;
    private PolicyService policyService;

    @BeforeEach
    void setUp() {
        claimService = new ClaimService();
        claimService.init();

        validationService = new ValidationService();

        policyService = new PolicyService();
        policyService.init();
    }

    @Test
    @DisplayName("ClaimService loads all 8 demo cases from demo_cases.mock.json")
    void testLoadsAllDemoCases() {
        List<ClaimBundle> claims = claimService.getAllClaims();
        assertNotNull(claims);
        assertEquals(8, claims.size(), "Should load exactly 8 demo cases");

        Optional<ClaimBundle> wanjiru = claimService.getClaim("CLM-2026-001");
        assertTrue(wanjiru.isPresent(), "Wanjiru's headline claim CLM-2026-001 must exist");
        assertEquals("P-0142", wanjiru.get().grading().plotId());
        assertEquals(Contracts.OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP, wanjiru.get().decision().outcomeClass());
    }

    @Test
    @DisplayName("Adjuster sign-off updates the AuditRecord and maintains immutability")
    void testAdjusterSignOff() {
        ClaimBundle.AdjusterDecisionRequest req = new ClaimBundle.AdjusterDecisionRequest(
                "ADJ-WANJIRU-REVIEWER",
                Contracts.AdjusterAction.APPROVED,
                "Approved after inspecting flowering window dry-spell overlap."
        );

        ClaimBundle updated = claimService.updateAdjusterDecision("CLM-2026-001", req);
        assertNotNull(updated);
        assertEquals(Contracts.AdjusterAction.APPROVED, updated.audit().adjusterAction());
        assertEquals("ADJ-WANJIRU-REVIEWER", updated.audit().adjusterId());
        assertTrue(updated.audit().adjusterNotes().contains("flowering window"));
        assertNotNull(updated.audit().decidedAtUtc());
    }

    @Test
    @DisplayName("ValidationService returns valid 4-arm ablation metrics")
    void testValidationSummary() {
        Map<String, Object> summary = validationService.getValidationSummary();
        assertNotNull(summary);
        assertTrue(summary.containsKey("ablation_study"));
        assertTrue(summary.containsKey("risk_coverage_curve"));
        assertTrue(summary.containsKey("integrity_forensics"));
        assertTrue(summary.containsKey("frozen_protocol"));
        assertTrue(summary.containsKey("unit_economics"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> arms = (List<Map<String, Object>>) summary.get("ablation_study");
        assertEquals(4, arms.size(), "Should have exactly 4 ablation arms");

        Map<String, Object> fullConcordance = arms.get(3);
        assertEquals("Full Three-Signal Concordance", fullConcordance.get("arm_name"));
        assertEquals(88.7, fullConcordance.get("accuracy"));
    }

    @Test
    @DisplayName("PolicyService loads clause index and illustrative text")
    void testPolicyService() {
        assertNotNull(policyService.getClauseIndex());
        assertNotNull(policyService.getPolicyTextResponse().get("full_text"));
    }
}
