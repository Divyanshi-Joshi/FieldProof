package com.fieldproof.api;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.api.dto.Contracts.IndexDoctorSimulation;
import com.fieldproof.tools.IndexDoctorService;
import com.fieldproof.tools.IndexDoctorService.RecalibrationRecommendation;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for the FieldProof Index Doctor slider.
 * <p>
 * Provides a single endpoint that evaluates the test plot dataset
 * at any trigger percentile and returns structured simulation results.
 *
 * <pre>
 * GET /api/index-doctor?percentile=30
 * </pre>
 */
@RestController
@RequestMapping("/api")
public class IndexDoctorController {

    private final IndexDoctorService service;

    public IndexDoctorController() {
        this.service = new IndexDoctorService();
    }

    /**
     * Runs the Index Doctor simulation at the given trigger percentile.
     *
     * @param percentile rainfall trigger percentile (5–60, default 30)
     * @return structured simulation response with disclaimer
     */
    @GetMapping({"/index-doctor", "/index-doctor/simulate"})
    public ResponseEntity<Map<String, Object>> simulate(
            @RequestParam(name = "percentile", defaultValue = "30") int percentile) {

        if (percentile < 5 || percentile > 60) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "percentile must be between 5 and 60",
                "received", percentile
            ));
        }

        IndexDoctorSimulation simulation = service.simulate(percentile);
        List<RecalibrationRecommendation> recommendations =
            service.getRecalibrationRecommendations(percentile);

        // Build response envelope with simulation, recommendations, and disclaimer
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("simulation", simulation);
        response.put("recalibration_recommendations", recommendations);
        response.put("disclaimer", IndexDoctorService.DISCLAIMER);

        return ResponseEntity.ok(response);
    }

    /**
     * BigQuery ML Predictive Basis-Risk Actuarial Forecasting endpoint.
     * Evaluates a 14-day forward rainfall distribution and payout probability envelope.
     *
     * <pre>
     * GET /api/index-doctor/forecast?county=Embu&percentile=30
     * GET /api/doctor/forecast?county=Embu&percentile=30
     * </pre>
     */
    @GetMapping({"/index-doctor/forecast", "/doctor/forecast"})
    public ResponseEntity<Contracts.CountyActuarialForecast> getCountyForecast(
            @RequestParam(name = "county", defaultValue = "Embu") String county,
            @RequestParam(name = "percentile", defaultValue = "30") int percentile) {

        Contracts.CountyActuarialForecast forecast = service.getCountyForecast(county, percentile);
        return ResponseEntity.ok(forecast);
    }
}
