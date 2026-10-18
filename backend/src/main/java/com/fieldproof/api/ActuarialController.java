package com.fieldproof.api;

import com.fieldproof.ai.ActuarialForecastingService;
import com.fieldproof.api.dto.Contracts;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API for Pillar 3: Actuarial Forecasting via Gemini Sandboxed Code Execution.
 */
@RestController
@RequestMapping("/api/actuarial")
public class ActuarialController {

    private final ActuarialForecastingService actuarialForecastingService;

    public ActuarialController(ActuarialForecastingService actuarialForecastingService) {
        this.actuarialForecastingService = actuarialForecastingService;
    }

    @GetMapping("/forecast")
    public ResponseEntity<Contracts.ActuarialForecastResult> getForecast(
            @RequestParam(value = "plot_id", required = false, defaultValue = "P-0142") String plotId,
            @RequestParam(value = "county", required = false, defaultValue = "Makueni") String county,
            @RequestParam(value = "season", required = false, defaultValue = "2026-LR") String season,
            @RequestParam(value = "current_rain_mm", required = false) Double currentRainMm,
            @RequestParam(value = "trigger_rain_mm", required = false) Double triggerRainMm
    ) {
        Contracts.ActuarialForecastResult result = actuarialForecastingService.forecastForwardRisk(
                plotId, county, season, currentRainMm, triggerRainMm
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping("/counties")
    public ResponseEntity<List<Map<String, Object>>> getActuarialCounties() {
        List<Map<String, Object>> counties = List.of(
                Map.of("id", "beed", "name", "Beed (Maharashtra)", "trigger_p30_mm", 290.0, "historical_payout_rate_pct", 24.2, "sample_plot", "P-0142"),
                Map.of("id", "jalna", "name", "Jalna (Maharashtra)", "trigger_p30_mm", 285.0, "historical_payout_rate_pct", 26.5, "sample_plot", "P-0217"),
                Map.of("id", "latur", "name", "Latur (Maharashtra)", "trigger_p30_mm", 310.0, "historical_payout_rate_pct", 18.9, "sample_plot", "P-0389"),
                Map.of("id", "akola", "name", "Akola (Vidarbha)", "trigger_p30_mm", 350.0, "historical_payout_rate_pct", 9.4, "sample_plot", "P-0504"),
                Map.of("id", "dewas", "name", "Dewas (Madhya Pradesh)", "trigger_p30_mm", 380.0, "historical_payout_rate_pct", 7.1, "sample_plot", "P-1078")
        );
        return ResponseEntity.ok(counties);
    }
}
