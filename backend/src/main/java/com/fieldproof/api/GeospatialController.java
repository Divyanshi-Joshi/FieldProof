package com.fieldproof.api;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.tools.gee.EarthEngineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * REST API for Google Earth Engine (GEE) & Vertex Geospatial intelligence.
 *
 * Provides real-time dynamic Sentinel-2 NDVI 3-year baseline calculations
 * and CHIRPS rainfall moisture deficits for farmer plot coordinates.
 */
@RestController
@RequestMapping("/api/geospatial")
public class GeospatialController {

    private final EarthEngineService earthEngineService;
    private final com.fieldproof.ai.OrbitToFieldService orbitToFieldService;

    public GeospatialController(EarthEngineService earthEngineService,
                                com.fieldproof.ai.OrbitToFieldService orbitToFieldService) {
        this.earthEngineService = earthEngineService;
        this.orbitToFieldService = orbitToFieldService;
    }

    @GetMapping("/orbit-to-field")
    public ResponseEntity<Contracts.EarthEngineAnalysis> analyzeOrbitToField(
            @RequestParam(value = "plot_id", required = false) String plotId,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lon", required = false) Double lon,
            @RequestParam(value = "season", required = false, defaultValue = "2026-LR") String season,
            @RequestParam(value = "crop", required = false, defaultValue = "maize") String crop
    ) {
        Contracts.EarthEngineAnalysis analysis = earthEngineService.analyzePlot(plotId, lat, lon, season, crop);
        return ResponseEntity.ok(analysis);
    }

    @GetMapping("/synthesize/{claimId}")
    public ResponseEntity<Contracts.OrbitToFieldSynthesis> synthesizeClaimOrbitToField(
            @PathVariable("claimId") String claimId
    ) {
        Contracts.OrbitToFieldSynthesis synthesis = orbitToFieldService.synthesizeClaim(claimId);
        return ResponseEntity.ok(synthesis);
    }

    @GetMapping("/synthesize")
    public ResponseEntity<Contracts.OrbitToFieldSynthesis> synthesizePlotOrbitToField(
            @RequestParam(value = "plot_id", required = false, defaultValue = "P-0142") String plotId,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lon", required = false) Double lon
    ) {
        Contracts.OrbitToFieldSynthesis synthesis = orbitToFieldService.synthesizePlot(plotId, lat, lon);
        return ResponseEntity.ok(synthesis);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getGeospatialStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        boolean liveGee = earthEngineService.checkLiveEarthEngineAuth();

        status.put("geospatial_engine", "Google Earth Engine + Vertex Geospatial");
        status.put("live_gee_authenticated", liveGee);
        status.put("cloud_platform", "Google Cloud Platform (Vertex AI Mode)");
        status.put("sensors", List.of(
                Map.of(
                        "collection", "COPERNICUS/S2_SR_HARMONIZED",
                        "name", "Sentinel-2 L2A Surface Reflectance",
                        "resolution_meters", 10,
                        "bands_used", List.of("B8 (NIR)", "B4 (Red)", "SCL (Scene Classification)")
                ),
                Map.of(
                        "collection", "UCSB-CHG/CHIRPS/DAILY",
                        "name", "CHIRPS Precipitation Pentad/Daily",
                        "resolution_degrees", 0.05,
                        "frequency", "daily"
                )
        ));
        status.put("baseline_algorithm", "3-Year Multi-Temporal Seasonal Harmonic Mean (2023-2025)");
        status.put("anomaly_metric", "Gaussian Z-Score Anomaly (cutoff: z <= -1.5 standard deviations)");
        return ResponseEntity.ok(status);
    }
}
