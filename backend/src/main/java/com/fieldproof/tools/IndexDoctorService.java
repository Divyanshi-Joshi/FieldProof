package com.fieldproof.tools;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.api.dto.Contracts.*;
import com.fieldproof.core.ConcordanceTable;
import com.fieldproof.core.ConcordanceTable.ConcordanceResult;
import com.fieldproof.core.SeverityBand;
import com.fieldproof.core.TriggerRule;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Index Doctor simulation service for FieldProof.
 * <p>
 * Provides a deterministic in-memory simulation engine that evaluates
 * test plots at any trigger percentile (5–60) and returns structured
 * {@link IndexDoctorSimulation} results matching Contracts.java.
 * <p>
 * The engine is seeded with realistic multi-county Kenyan test plot
 * distributions (Embu, Machakos, Kirinyaga, Nakuru, Bungoma across
 * Long Rains and Short Rains), including Ramesh's P-0142 plot in Embu.
 * <p>
 * Runs in &lt;5 ms offline or in Cloud Run — no BigQuery required.
 * <p>
 * This class uses only pure-Java deterministic logic from {@code core/}.
 * Zero AI/LLM SDK imports.
 */
public final class IndexDoctorService {

    /** Required spec disclaimer (FROZEN_TRIGGER_PROTOCOL §6). */
    public static final String DISCLAIMER =
        "Simulation on historical test plots using a flat $100 USD "
        + "illustrative payout assumption; not actuarial pricing advice.";

    private final List<TestPlot> testPlots;
    private final Map<String, RainfallDistribution> distributions;

    // ── Construction ─────────────────────────────────────────────────────────

    /**
     * Creates a service with the default seeded Kenyan test plot dataset.
     */
    public IndexDoctorService() {
        this.distributions = buildDefaultDistributions();
        this.testPlots = buildDefaultTestPlots();
    }

    /**
     * Creates a service with custom test plots and distributions (for testing).
     */
    public IndexDoctorService(List<TestPlot> testPlots,
                              Map<String, RainfallDistribution> distributions) {
        this.testPlots = List.copyOf(testPlots);
        this.distributions = Map.copyOf(distributions);
    }

    // ── Data Records ─────────────────────────────────────────────────────────

    /**
     * A test plot with all attributes needed for concordance evaluation.
     */
    public record TestPlot(
        String plotId,
        String county,
        String season,
        double seasonRainMm,
        Contracts.SeverityBand severityBand,
        boolean passesAgreed,
        DamageType damageType,
        boolean satelliteStress,
        double ndviAnomalyZ,
        boolean drySpellOverlapsCriticalStage,
        int maxDrySpellDays
    ) {}

    /**
     * Per-county+season rainfall percentile distribution.
     * Maps percentile (5, 10, 15, ..., 60) → trigger_rain_mm.
     */
    public record RainfallDistribution(
        String county,
        String season,
        NavigableMap<Integer, Double> percentileToMm
    ) {
        /** Interpolates the trigger rainfall at a given percentile. */
        public double triggerAt(int percentile) {
            Double exact = percentileToMm.get(percentile);
            if (exact != null) return exact;

            Map.Entry<Integer, Double> lower = percentileToMm.floorEntry(percentile);
            Map.Entry<Integer, Double> upper = percentileToMm.ceilingEntry(percentile);

            if (lower == null) return upper.getValue();
            if (upper == null) return lower.getValue();

            // Linear interpolation
            double frac = (double)(percentile - lower.getKey())
                        / (upper.getKey() - lower.getKey());
            return lower.getValue() + frac * (upper.getValue() - lower.getValue());
        }

        /** Median rainfall (50th percentile). */
        public double median() {
            return triggerAt(50);
        }
    }

    /**
     * Per-plot evaluation result at a specific trigger percentile.
     */
    public record PlotEvaluation(
        TestPlot plot,
        double triggerRainMm,
        boolean indexPays,
        boolean photoDamaged,
        boolean lowLocalRain,
        OutcomeClass outcomeClass
    ) {}

    /**
     * Recalibration recommendation for a county with clustered gaps.
     */
    public record RecalibrationRecommendation(
        String county,
        int phenologicalGapCount,
        String recommendation
    ) {}

    // ── Core Simulation ──────────────────────────────────────────────────────

    /**
     * Runs the Index Doctor simulation at the given trigger percentile.
     *
     * @param triggerPercentile percentile for the rainfall trigger (5–60)
     * @return structured simulation result matching Contracts.IndexDoctorSimulation
     * @throws IllegalArgumentException if percentile is outside 5–60
     */
    public IndexDoctorSimulation simulate(int triggerPercentile) {
        if (triggerPercentile < 5 || triggerPercentile > 60) {
            throw new IllegalArgumentException(
                "trigger_percentile must be between 5 and 60, got " + triggerPercentile);
        }

        // Evaluate each plot
        List<PlotEvaluation> evaluations = evaluatePlots(triggerPercentile);

        // Aggregate overall
        int totalPlots = evaluations.size();
        int payoutCount = 0, gapCount = 0, overpaymentCount = 0;

        for (PlotEvaluation eval : evaluations) {
            if (eval.indexPays()) payoutCount++;
            if (eval.outcomeClass() == OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP
                || eval.outcomeClass() == OutcomeClass.SPATIAL_BASIS_RISK_GAP) {
                gapCount++;
            }
            if (eval.outcomeClass() == OutcomeClass.POSSIBLE_OVERPAYMENT) {
                overpaymentCount++;
            }
        }

        double payoutFrequency = totalPlots > 0 ? (double) payoutCount / totalPlots : 0;
        double gapRate = totalPlots > 0 ? (double) gapCount / totalPlots : 0;
        double overpaymentRate = totalPlots > 0 ? (double) overpaymentCount / totalPlots : 0;
        double payoutUsd = payoutCount * TriggerRule.ILLUSTRATIVE_PAYOUT_USD;

        // Median trigger threshold across all distributions
        double medianTriggerMm = distributions.values().stream()
            .mapToDouble(d -> d.triggerAt(triggerPercentile))
            .average()
            .orElse(0.0);

        // County breakdown
        Map<String, List<PlotEvaluation>> byCounty = evaluations.stream()
            .collect(Collectors.groupingBy(e -> e.plot().county()));
        List<CountyStats> countyBreakdown = byCounty.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(e -> buildCountyStats(e.getKey(), e.getValue()))
            .toList();

        // Season breakdown
        Map<String, List<PlotEvaluation>> bySeason = evaluations.stream()
            .collect(Collectors.groupingBy(e -> e.plot().season()));
        List<SeasonStats> seasonBreakdown = bySeason.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(e -> buildSeasonStats(e.getKey(), e.getValue()))
            .toList();

        return new IndexDoctorSimulation(
            triggerPercentile,
            medianTriggerMm,
            totalPlots,
            gapCount,
            gapRate,
            overpaymentCount,
            overpaymentRate,
            payoutCount,
            payoutFrequency,
            payoutUsd,
            TriggerRule.ILLUSTRATIVE_PAYOUT_USD,
            countyBreakdown,
            seasonBreakdown,
            Instant.now()
        );
    }

    /**
     * Evaluates all test plots at the given percentile.
     */
    public List<PlotEvaluation> evaluatePlots(int triggerPercentile) {
        List<PlotEvaluation> results = new ArrayList<>();

        for (TestPlot plot : testPlots) {
            String distKey = distKey(plot.county(), plot.season());
            RainfallDistribution dist = distributions.get(distKey);
            if (dist == null) continue;

            double triggerMm = dist.triggerAt(triggerPercentile);
            double medianMm = dist.median();

            boolean indexPays = TriggerRule.indexPays(plot.seasonRainMm(), triggerMm);
            boolean lowLocalRain = TriggerRule.lowLocalRain(
                plot.seasonRainMm(), triggerMm, medianMm);
            boolean photoDamaged = SeverityBand.isPhotoDamaged(
                plot.severityBand(), plot.passesAgreed());

            // Run concordance
            ConcordanceResult concordance = ConcordanceTable.evaluate(
                true,                           // integrityPassed (test plots all pass)
                !plot.passesAgreed(),            // abstainToHuman
                plot.severityBand(),
                plot.damageType(),
                indexPays,
                plot.satelliteStress(),
                plot.drySpellOverlapsCriticalStage(),
                lowLocalRain
            );

            results.add(new PlotEvaluation(
                plot, triggerMm, indexPays, photoDamaged,
                lowLocalRain, concordance.outcomeClass()
            ));
        }

        return results;
    }

    /**
     * Generates recalibration recommendations for counties with
     * clustered phenological basis-risk gaps.
     */
    public List<RecalibrationRecommendation> getRecalibrationRecommendations(
            int triggerPercentile) {

        List<PlotEvaluation> evaluations = evaluatePlots(triggerPercentile);
        Map<String, List<PlotEvaluation>> byCounty = evaluations.stream()
            .collect(Collectors.groupingBy(e -> e.plot().county()));

        List<RecalibrationRecommendation> recommendations = new ArrayList<>();

        for (Map.Entry<String, List<PlotEvaluation>> entry : byCounty.entrySet()) {
            String county = entry.getKey();
            long phenoGapCount = entry.getValue().stream()
                .filter(e -> e.outcomeClass() == OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP)
                .count();

            if (phenoGapCount > 0) {
                String rec = county + ": " + phenoGapCount + " plot(s) show "
                    + "phenological basis-risk gaps at the " + triggerPercentile
                    + "th percentile trigger. These plots share a flowering-window "
                    + "dry spell that the seasonal rainfall total missed. "
                    + "Propose adding a flowering-window sub-trigger check to the index.";
                recommendations.add(new RecalibrationRecommendation(
                    county, (int) phenoGapCount, rec));
            }
        }

        return recommendations;
    }

    /**
     * Returns the list of test plots (for testing/inspection).
     */
    public List<TestPlot> getTestPlots() {
        return Collections.unmodifiableList(testPlots);
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    private static CountyStats buildCountyStats(String county,
            List<PlotEvaluation> evals) {
        int total = evals.size();
        int payout = 0, gap = 0, overpay = 0;

        for (PlotEvaluation e : evals) {
            if (e.indexPays()) payout++;
            if (e.outcomeClass() == OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP
                || e.outcomeClass() == OutcomeClass.SPATIAL_BASIS_RISK_GAP) gap++;
            if (e.outcomeClass() == OutcomeClass.POSSIBLE_OVERPAYMENT) overpay++;
        }

        return new CountyStats(county, total, gap,
            total > 0 ? (double) gap / total : 0,
            overpay, total > 0 ? (double) overpay / total : 0,
            payout, total > 0 ? (double) payout / total : 0);
    }

    private static SeasonStats buildSeasonStats(String season,
            List<PlotEvaluation> evals) {
        int total = evals.size();
        int payout = 0, gap = 0, overpay = 0;

        for (PlotEvaluation e : evals) {
            if (e.indexPays()) payout++;
            if (e.outcomeClass() == OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP
                || e.outcomeClass() == OutcomeClass.SPATIAL_BASIS_RISK_GAP) gap++;
            if (e.outcomeClass() == OutcomeClass.POSSIBLE_OVERPAYMENT) overpay++;
        }

        return new SeasonStats(season, total, gap,
            total > 0 ? (double) gap / total : 0,
            overpay, total > 0 ? (double) overpay / total : 0,
            payout, total > 0 ? (double) payout / total : 0);
    }

    private static String distKey(String county, String season) {
        return county + "|" + season;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Default Seeded Test Plot Dataset — Realistic Kenyan Distributions
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Builds realistic rainfall percentile distributions for 5 Kenyan counties
     * across Long Rains (MAM) and Short Rains (OND).
     * <p>
     * Values are based on ERA5 1991–2020 climatology patterns for Kenya's
     * central highlands, eastern lowlands, and western highlands.
     */
    private static Map<String, RainfallDistribution> buildDefaultDistributions() {
        Map<String, RainfallDistribution> map = new LinkedHashMap<>();

        // Embu (Central highlands) — Long Rains
        map.put(distKey("Embu", "Long Rains"), new RainfallDistribution(
            "Embu", "Long Rains", percentiles(
                5, 180, 10, 210, 15, 235, 20, 255, 25, 273,
                30, 290, 35, 310, 40, 330, 45, 350, 50, 375,
                55, 400, 60, 430)));

        // Embu — Short Rains
        map.put(distKey("Embu", "Short Rains"), new RainfallDistribution(
            "Embu", "Short Rains", percentiles(
                5, 120, 10, 145, 15, 165, 20, 180, 25, 195,
                30, 210, 35, 225, 40, 240, 45, 255, 50, 270,
                55, 290, 60, 310)));

        // Machakos (Eastern lowlands) — Long Rains
        map.put(distKey("Machakos", "Long Rains"), new RainfallDistribution(
            "Machakos", "Long Rains", percentiles(
                5, 140, 10, 165, 15, 185, 20, 200, 25, 215,
                30, 230, 35, 248, 40, 265, 45, 280, 50, 300,
                55, 320, 60, 345)));

        // Machakos — Short Rains
        map.put(distKey("Machakos", "Short Rains"), new RainfallDistribution(
            "Machakos", "Short Rains", percentiles(
                5, 95, 10, 115, 15, 130, 20, 145, 25, 158,
                30, 170, 35, 183, 40, 195, 45, 210, 50, 225,
                55, 240, 60, 260)));

        // Kirinyaga (Central highlands, irrigated) — Long Rains
        map.put(distKey("Kirinyaga", "Long Rains"), new RainfallDistribution(
            "Kirinyaga", "Long Rains", percentiles(
                5, 200, 10, 230, 15, 255, 20, 275, 25, 295,
                30, 315, 35, 335, 40, 355, 45, 375, 50, 400,
                55, 425, 60, 455)));

        // Kirinyaga — Short Rains
        map.put(distKey("Kirinyaga", "Short Rains"), new RainfallDistribution(
            "Kirinyaga", "Short Rains", percentiles(
                5, 135, 10, 160, 15, 180, 20, 195, 25, 210,
                30, 225, 35, 240, 40, 255, 45, 270, 50, 290,
                55, 310, 60, 335)));

        // Nakuru (Rift Valley) — Long Rains
        map.put(distKey("Nakuru", "Long Rains"), new RainfallDistribution(
            "Nakuru", "Long Rains", percentiles(
                5, 160, 10, 190, 15, 215, 20, 235, 25, 250,
                30, 265, 35, 285, 40, 305, 45, 325, 50, 350,
                55, 375, 60, 400)));

        // Nakuru — Short Rains
        map.put(distKey("Nakuru", "Short Rains"), new RainfallDistribution(
            "Nakuru", "Short Rains", percentiles(
                5, 105, 10, 125, 15, 142, 20, 155, 25, 168,
                30, 180, 35, 195, 40, 210, 45, 225, 50, 240,
                55, 258, 60, 275)));

        // Bungoma (Western highlands) — Long Rains
        map.put(distKey("Bungoma", "Long Rains"), new RainfallDistribution(
            "Bungoma", "Long Rains", percentiles(
                5, 220, 10, 255, 15, 280, 20, 305, 25, 325,
                30, 345, 35, 365, 40, 388, 45, 410, 50, 435,
                55, 460, 60, 490)));

        // Bungoma — Short Rains
        map.put(distKey("Bungoma", "Short Rains"), new RainfallDistribution(
            "Bungoma", "Short Rains", percentiles(
                5, 150, 10, 175, 15, 195, 20, 215, 25, 232,
                30, 250, 35, 268, 40, 285, 45, 305, 50, 325,
                55, 345, 60, 370)));

        return map;
    }

    /** Helper to build a percentile map from varargs: p1, v1, p2, v2, ... */
    private static NavigableMap<Integer, Double> percentiles(int... pv) {
        TreeMap<Integer, Double> map = new TreeMap<>();
        for (int i = 0; i < pv.length; i += 2) {
            map.put(pv[i], (double) pv[i + 1]);
        }
        return map;
    }

    /**
     * Builds the default 24-plot Kenyan test dataset.
     * <p>
     * Includes Ramesh's P-0142 in Embu (Long Rains, 341mm, SEVERE drought,
     * NDVI z = -1.9, 21-day flowering dry spell) — the headline plot.
     * <p>
     * Distribution:
     * <ul>
     *   <li>Embu: 5 plots (Long Rains) + 2 plots (Short Rains)</li>
     *   <li>Machakos: 4 plots (Long Rains) + 2 plots (Short Rains)</li>
     *   <li>Kirinyaga: 3 plots (Long Rains) + 1 plot (Short Rains)</li>
     *   <li>Nakuru: 3 plots (Long Rains) + 1 plot (Short Rains)</li>
     *   <li>Bungoma: 2 plots (Long Rains) + 1 plot (Short Rains)</li>
     * </ul>
     */
    private static List<TestPlot> buildDefaultTestPlots() {
        List<TestPlot> plots = new ArrayList<>();

        // ── EMBU — Long Rains ────────────────────────────────────────────────
        //  P-0142 (Ramesh): 341mm, SEVERE drought, sat stressed, 21-day flowering dry spell
        //  At p30 (trigger=290mm): index does NOT pay → PHENOLOGICAL_BASIS_RISK_GAP
        plots.add(new TestPlot("P-0142", "Embu", "Long Rains", 341.0,
            Contracts.SeverityBand.SEVERE, true, DamageType.drought,
            true, -1.9, true, 21));

        //  P-0101: 260mm, MODERATE drought, sat stressed, no flowering overlap
        //  At p30 (290mm): 260 < 290 → index PAYS + damage → CONFIRMED_PAYOUT
        plots.add(new TestPlot("P-0101", "Embu", "Long Rains", 260.0,
            Contracts.SeverityBand.MODERATE, true, DamageType.drought,
            true, -1.5, false, 8));

        //  P-0103: 410mm, NONE, healthy
        //  At p30: 410 >= 290 → no pay + no damage → CONSISTENT
        plots.add(new TestPlot("P-0103", "Embu", "Long Rains", 410.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.3, false, 4));

        //  P-0104: 280mm, MILD drought, no sat stress
        //  At p30: 280 < 290 → index PAYS + no photo damage → POSSIBLE_OVERPAYMENT
        plots.add(new TestPlot("P-0104", "Embu", "Long Rains", 280.0,
            Contracts.SeverityBand.MILD, true, DamageType.drought,
            false, -0.5, false, 6));

        //  P-0105: 305mm, MODERATE drought, sat stressed, flowering overlap
        //  At p30: 305 >= 290 → no pay + damaged + sat stress + overlap → PHENOLOGICAL_GAP
        plots.add(new TestPlot("P-0105", "Embu", "Long Rains", 305.0,
            Contracts.SeverityBand.MODERATE, true, DamageType.drought,
            true, -1.3, true, 15));

        // ── EMBU — Short Rains ───────────────────────────────────────────────
        plots.add(new TestPlot("P-0106", "Embu", "Short Rains", 190.0,
            Contracts.SeverityBand.MODERATE, true, DamageType.drought,
            true, -1.2, false, 10));

        plots.add(new TestPlot("P-0107", "Embu", "Short Rains", 280.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.1, false, 3));

        // ── MACHAKOS — Long Rains ────────────────────────────────────────────
        //  P-0201: 215mm, SEVERE drought, sat stressed, flowering overlap
        //  At p30 (230mm): 215 < 230 → CONFIRMED_PAYOUT
        plots.add(new TestPlot("P-0201", "Machakos", "Long Rains", 215.0,
            Contracts.SeverityBand.SEVERE, true, DamageType.drought,
            true, -2.1, true, 25));

        //  P-0202: 245mm, MODERATE drought, sat stressed, flowering overlap
        //  At p30 (230mm): 245 >= 230 → PHENOLOGICAL_BASIS_RISK_GAP
        plots.add(new TestPlot("P-0202", "Machakos", "Long Rains", 245.0,
            Contracts.SeverityBand.MODERATE, true, DamageType.drought,
            true, -1.4, true, 14));

        //  P-0203: 320mm, NONE, healthy
        plots.add(new TestPlot("P-0203", "Machakos", "Long Rains", 320.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.5, false, 2));

        //  P-0204: 220mm, MILD, no sat stress
        //  At p30: 220 < 230 → POSSIBLE_OVERPAYMENT (pays but no photo damage)
        plots.add(new TestPlot("P-0204", "Machakos", "Long Rains", 220.0,
            Contracts.SeverityBand.MILD, true, DamageType.drought,
            false, -0.3, false, 5));

        // ── MACHAKOS — Short Rains ───────────────────────────────────────────
        plots.add(new TestPlot("P-0205", "Machakos", "Short Rains", 155.0,
            Contracts.SeverityBand.MODERATE, true, DamageType.drought,
            true, -1.1, true, 12));

        plots.add(new TestPlot("P-0206", "Machakos", "Short Rains", 240.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.2, false, 3));

        // ── KIRINYAGA — Long Rains ───────────────────────────────────────────
        plots.add(new TestPlot("P-0301", "Kirinyaga", "Long Rains", 290.0,
            Contracts.SeverityBand.SEVERE, true, DamageType.drought,
            true, -1.8, true, 18));

        plots.add(new TestPlot("P-0302", "Kirinyaga", "Long Rains", 420.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.4, false, 2));

        plots.add(new TestPlot("P-0303", "Kirinyaga", "Long Rains", 330.0,
            Contracts.SeverityBand.MODERATE, true, DamageType.drought,
            true, -1.2, false, 7));

        // ── KIRINYAGA — Short Rains ──────────────────────────────────────────
        plots.add(new TestPlot("P-0304", "Kirinyaga", "Short Rains", 300.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.6, false, 1));

        // ── NAKURU — Long Rains ──────────────────────────────────────────────
        plots.add(new TestPlot("P-0401", "Nakuru", "Long Rains", 250.0,
            Contracts.SeverityBand.MODERATE, true, DamageType.drought,
            true, -1.3, true, 16));

        plots.add(new TestPlot("P-0402", "Nakuru", "Long Rains", 360.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.2, false, 3));

        plots.add(new TestPlot("P-0403", "Nakuru", "Long Rains", 270.0,
            Contracts.SeverityBand.SEVERE, true, DamageType.drought,
            true, -1.7, false, 9));

        // ── NAKURU — Short Rains ─────────────────────────────────────────────
        plots.add(new TestPlot("P-0404", "Nakuru", "Short Rains", 250.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.3, false, 2));

        // ── BUNGOMA — Long Rains ─────────────────────────────────────────────
        plots.add(new TestPlot("P-0501", "Bungoma", "Long Rains", 320.0,
            Contracts.SeverityBand.SEVERE, true, DamageType.drought,
            true, -1.6, true, 19));

        plots.add(new TestPlot("P-0502", "Bungoma", "Long Rains", 460.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.7, false, 1));

        // ── BUNGOMA — Short Rains ────────────────────────────────────────────
        plots.add(new TestPlot("P-0503", "Bungoma", "Short Rains", 340.0,
            Contracts.SeverityBand.NONE, true, DamageType.none,
            false, 0.4, false, 2));

        return plots;
    }
}
