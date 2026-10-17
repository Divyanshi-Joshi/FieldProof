package com.fieldproof.tools;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.tools.gee.EarthEngineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EarthEngineServiceTest {

    private EarthEngineService earthEngineService;

    @BeforeEach
    void setUp() {
        earthEngineService = new EarthEngineService();
    }

    @Test
    @DisplayName("analyzePlot for P-0142 computes 3-year baseline and detects drought satellite stress")
    void testHeadlineCaseMakueni() {
        Contracts.EarthEngineAnalysis result = earthEngineService.analyzePlot(
                "P-0142",
                null,
                null,
                "2026-LR",
                "maize"
        );

        assertNotNull(result);
        assertEquals("P-0142", result.plotId());
        assertTrue(result.latitude() < -1.0, "Latitude should match Makueni centroid");
        assertTrue(result.longitude() > 37.0, "Longitude should match Makueni centroid");

        // Verify multi-spectral sensor metadata
        assertTrue(result.collectionSensor().contains("COPERNICUS/S2_SR_HARMONIZED"));
        assertTrue(result.rainfallSensor().contains("CHIRPS"));

        // Verify 3-year historical baseline
        assertNotNull(result.historicalNdviSeries());
        assertEquals(3, result.historicalNdviSeries().size());
        assertEquals(2023, result.historicalNdviSeries().get(0).year());
        assertEquals(2024, result.historicalNdviSeries().get(1).year());
        assertEquals(2025, result.historicalNdviSeries().get(2).year());

        // Baseline mean should be ~0.51
        assertTrue(result.ndviBaselineMean() > 0.45 && result.ndviBaselineMean() < 0.60);

        // Observed NDVI should be stressed (~0.31)
        assertEquals(0.31, result.ndviObserved(), 0.05);

        // Anomaly Z-Score should be <= -1.5 (satellite stress confirmed)
        assertTrue(result.ndviAnomalyZ() <= -1.5, "Anomaly Z score must confirm stress");
        assertTrue(result.satelliteStress(), "satelliteStress must be true");

        // 21-day dry spell overlapping flowering
        assertEquals(21, result.maxDrySpellDays());
        assertTrue(result.drySpellOverlapsCriticalStage());
    }

    @Test
    @DisplayName("createEvidenceRecord outputs valid EvidenceRecord with GOOGLE_EARTH_ENGINE source")
    void testCreateEvidenceRecord() {
        Contracts.EvidenceRecord evidence = earthEngineService.createEvidenceRecord(
                "P-0142",
                -1.8021,
                37.6253,
                "Makueni",
                "2026-LR",
                "maize"
        );

        assertNotNull(evidence);
        assertEquals("P-0142", evidence.plotId());
        assertEquals("Makueni", evidence.county());
        assertEquals(Contracts.EvidenceSource.GOOGLE_EARTH_ENGINE, evidence.evidenceSource());
        assertTrue(evidence.satelliteStress());
        assertTrue(evidence.drySpellOverlapsCriticalStage());
        assertNotNull(evidence.evidenceTimestampUtc());
    }

    @Test
    @DisplayName("analyzePlot for custom GPS coordinates calculates dynamic NDVI Z-Score accurately")
    void testCustomCoordinates() {
        // High-rainfall Western Kenya coordinates
        Contracts.EarthEngineAnalysis westAnalysis = earthEngineService.analyzePlot(
                "P-CUSTOM-WEST",
                0.5833,
                34.4333,
                "2026-LR",
                "maize"
        );

        assertNotNull(westAnalysis);
        assertEquals("P-CUSTOM-WEST", westAnalysis.plotId());
        assertFalse(westAnalysis.satelliteStress(), "Western Kenya normal plot should not exhibit satellite stress");
        assertTrue(westAnalysis.ndviAnomalyZ() > -1.5);
    }
}
