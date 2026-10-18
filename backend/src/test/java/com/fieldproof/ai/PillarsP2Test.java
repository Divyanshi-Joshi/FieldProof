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
        assertTrue(queryResp.groundedAnswer().contains("Clause"));
        assertTrue(queryResp.citedClauses().stream().anyMatch(c -> c.clauseId().equals("CL-4.2")));
    }

    @Test
    @DisplayName("Pillar 3: Actuarial Forecasting generates Python code and calculates Monte Carlo forward risk")
    void testActuarialForecasting() {
        ActuarialForecastingService service = new ActuarialForecastingService(geminiGateway, objectMapper);
        Contracts.ActuarialForecastResult forecast = service.forecastForwardRisk(
                "P-0142", "makueni", "2026-LR", 245.0, 290.0
        );

        assertNotNull(forecast);
        assertEquals("P-0142", forecast.plotId());
        assertEquals("Makueni", forecast.county());
        assertEquals(245.0, forecast.currentCumulativeRainMm());
        assertEquals(290.0, forecast.triggerRainMm());
        assertTrue(forecast.forward14dPayoutProbability() > 0.0 && forecast.forward14dPayoutProbability() <= 1.0);
        assertNotNull(forecast.droughtEscalationRisk());
        assertTrue(forecast.projectedPortfolioOutlayUsd() > 0);
        assertEquals(14, forecast.forecastTimeSeries().size(), "Should have 14 forward daily projection points");
        assertNotNull(forecast.executedPythonCode());
        assertTrue(forecast.executedPythonCode().contains("import numpy as np"));
        assertTrue(forecast.sandboxExecutionOutput().contains("Monte Carlo simulation completed"));
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
