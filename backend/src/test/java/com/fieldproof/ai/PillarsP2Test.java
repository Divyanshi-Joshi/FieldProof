package com.fieldproof.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.api.dto.Contracts;
import com.fieldproof.config.FieldProofProperties;
import com.fieldproof.eval.ResponsibleAiService;
import com.fieldproof.policy.PolicyGroundingService;
import com.fieldproof.policy.PolicyIndex;
import com.fieldproof.tools.gee.EarthEngineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Phase 2: 4 Pillars for the Judges Tests")
class PillarsP2Test {

    private ObjectMapper objectMapper;
    private GeminiGateway geminiGateway;
    private EarthEngineService earthEngineService;
    private PolicyIndex policyIndex;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        FieldProofProperties props = new FieldProofProperties(
                new FieldProofProperties.Gcp("fieldproof-test", "global"),
                new FieldProofProperties.Gemini("gemini-2.0-flash-001", "0.2", "off", "high", 4, 4),
                null,
                null
        );
        ResponseCache cache = new ResponseCache(java.nio.file.Path.of("target/test-cache-" + System.currentTimeMillis()), objectMapper);
        geminiGateway = new GeminiGateway(props, cache, objectMapper, () -> {
            throw new RuntimeException("Simulated offline ADC in unit test");
        });
        earthEngineService = new EarthEngineService(props);
        policyIndex = new PolicyIndex(objectMapper);
    }

    @Test
    @DisplayName("Pillar 1: Orbit-to-Field Multimodal Intelligence synthesizes GEE telemetry and ground photos")
    void testOrbitToFieldSynthesis() {
        OrbitToFieldService service = new OrbitToFieldService(earthEngineService, geminiGateway, null, objectMapper);
        Contracts.OrbitToFieldSynthesis synthesis = service.synthesizePlot("P-0142", -1.8021, 37.6253);

        assertNotNull(synthesis);
        assertEquals("P-0142", synthesis.plotId());
        assertTrue(synthesis.opticalStressConfirmed(), "Makueni P-0142 should confirm optical vegetative stress");
        assertTrue(synthesis.phenologicalCoincidence(), "Makueni P-0142 should confirm flowering dry-spell overlap");
        assertTrue(synthesis.sentinel2ZScore() <= -1.5, "Sentinel-2 Z-score should be <= -1.5");
        assertTrue(synthesis.chirpsDrySpellDays() >= 14, "Dry spell should exceed 14 days");
        assertEquals("PHENOLOGICAL_BASIS_RISK_GAP", synthesis.concordanceClassification());
        assertFalse(synthesis.telemetryCitations().isEmpty(), "Should contain citations to Sentinel-2 and CHIRPS");
        assertTrue(synthesis.crossModalSynthesis().contains("Sentinel-2"));
    }

    @Test
    @DisplayName("Pillar 2: Policy Grounding verifies claims against 45-page master binder with zero hallucination")
    void testPolicyGrounding() {
        PolicyGroundingService service = new PolicyGroundingService(geminiGateway, policyIndex, null, objectMapper);
        Contracts.PolicyGroundingResult result = service.groundClaim("CLM-2026-001");

        assertNotNull(result);
        assertEquals("CLM-2026-001", result.claimId());
        assertTrue(result.zeroHallucinationVerified(), "All citations must be verified in PolicyIndex");
        assertFalse(result.citations().isEmpty());
        assertTrue(result.binderContextTokensUsed() >= 1000, "Should reflect long-context binder usage");

        // Test arbitrary legal question query
        Contracts.PolicyQueryResponse queryResp = service.answerPolicyGroundingQuery("How does Clause 4.2 define phenological basis risk?");
        assertNotNull(queryResp);
        assertEquals(1.0, queryResp.zeroHallucinationScore());
        assertTrue(queryResp.groundedAnswer().contains("Clause") || queryResp.groundedAnswer().contains("4.2"));
        assertTrue(queryResp.citedClauses().stream().anyMatch(c -> c.clauseId().equals("CL-4.2")));

        // Test Statutory PMFBY: Prevented Sowing §4.2.1
        Contracts.PolicyQueryResponse preventedSowingResp = service.answerPolicyGroundingQuery("Is prevented sowing covered under PMFBY §4.2.1?");
        assertNotNull(preventedSowingResp);
        assertEquals(1.0, preventedSowingResp.zeroHallucinationScore());
        assertTrue(preventedSowingResp.citedClauses().stream().anyMatch(c -> c.clauseId().equals("CL-4.2.1")));
        assertTrue(preventedSowingResp.groundedAnswer().contains("4.2.1") || preventedSowingResp.groundedAnswer().contains("Prevented Sowing"));

        // Test Statutory PMFBY: Localized Calamities §5.4
        Contracts.PolicyQueryResponse localizedResp = service.answerPolicyGroundingQuery("What is the protocol for localized calamities like hailstorm or inundation under §5.4?");
        assertNotNull(localizedResp);
        assertEquals(1.0, localizedResp.zeroHallucinationScore());
        assertTrue(localizedResp.citedClauses().stream().anyMatch(c -> c.clauseId().equals("CL-5.4")));
        assertTrue(localizedResp.groundedAnswer().contains("5.4") || localizedResp.groundedAnswer().contains("Localized Calamities"));

        // Test Statutory PMFBY: Post-Harvest Losses §7.1.4
        Contracts.PolicyQueryResponse postHarvestResp = service.answerPolicyGroundingQuery("How are post-harvest losses in cut & spread condition treated under §7.1.4?");
        assertNotNull(postHarvestResp);
        assertEquals(1.0, postHarvestResp.zeroHallucinationScore());
        assertTrue(postHarvestResp.citedClauses().stream().anyMatch(c -> c.clauseId().equals("CL-7.1.4")));
        assertTrue(postHarvestResp.groundedAnswer().contains("7.1.4") || postHarvestResp.groundedAnswer().contains("Post-Harvest"));
    }


    @Test
    @DisplayName("Pillar 4: Responsible AI framework evaluates Two-Pass Gate and Geographic Fairness")
    void testResponsibleAiCompliance() {
        ResponsibleAiService service = new ResponsibleAiService(null, null);

        // Two-Pass Gate check
        Contracts.TwoPassComparison twoPass = service.evaluateTwoPassGate("CLM-2026-001");
        assertNotNull(twoPass);
        assertEquals("CLM-2026-001", twoPass.claimId());
        assertNotNull(twoPass.pass1AnchorOrder());
        assertNotNull(twoPass.pass2AnchorOrder());
        assertNotEquals(twoPass.pass1AnchorOrder(), twoPass.pass2AnchorOrder(), "Anchors must be permuted across passes");

        // Google RAI Compliance audit
        Contracts.ResponsibleAiAudit audit = service.getComplianceAudit();
        assertNotNull(audit);
        assertTrue(audit.twoPassCoveragePct() >= 90.0);
        assertTrue(audit.modelAbstainRatePct() <= 10.0);
        assertFalse(audit.geographicFairness().isEmpty());
        assertTrue(audit.geographicFairness().stream().allMatch(f -> f.parityStatus().contains("PARITY CONFIRMED")));
        assertEquals(6, audit.compliancePrinciples().size());
    }
}
