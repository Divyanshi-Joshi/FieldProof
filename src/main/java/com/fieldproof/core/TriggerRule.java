package com.fieldproof.core;

/**
 * Frozen index trigger rule and satellite stress evaluation.
 * <p>
 * This class is 100% pure Java with zero AI/LLM SDK imports.
 * All thresholds are locked by protocol/FROZEN_TRIGGER_PROTOCOL.md §2, §3.
 * No post-hoc changes are permitted after test results are seen.
 */
public final class TriggerRule {

    private TriggerRule() {} // utility class

    // ── Frozen Protocol Constants ────────────────────────────────────────────

    /** Frozen trigger percentile (§2): bottom 30% of baseline distribution. */
    public static final int FROZEN_TRIGGER_PERCENTILE = 30;

    /** Frozen NDVI stress cut-off z-score (§3): strictly below −1.0σ. */
    public static final double FROZEN_NDVI_STRESS_CUTOFF_Z = -1.0;

    /** Frozen dry-day rainfall cutoff (§4.1): strictly below 1.0 mm. */
    public static final double FROZEN_DRY_DAY_CUTOFF_MM = 1.0;

    /** Frozen illustrative payout per plot for Index Doctor (§6). */
    public static final double ILLUSTRATIVE_PAYOUT_USD = 100.0;

    // ── §2  Index Trigger Rule ───────────────────────────────────────────────

    /**
     * Evaluates the frozen rainfall index trigger.
     * <p>
     * The index pays (returns {@code true}) when cumulative seasonal rainfall
     * at the plot is <b>strictly below</b> the trigger threshold (the 30th
     * percentile of the 1991–2020 ERA5 baseline).
     *
     * @param seasonRainMm  cumulative seasonal rainfall at the plot (mm)
     * @param triggerRainMm rainfall threshold at the 30th percentile (mm)
     * @return true if the index triggers a payout
     */
    public static boolean indexPays(double seasonRainMm, double triggerRainMm) {
        return seasonRainMm < triggerRainMm;
    }

    // ── §2.2  Local Spatial Deprivation Indicator ────────────────────────────

    /**
     * Detects spatial basis risk: plot-level rain is depressed below the county
     * median but did not breach the trigger.
     *
     * @param seasonRainMm  cumulative seasonal rainfall at the plot (mm)
     * @param triggerRainMm rainfall threshold at the 30th percentile (mm)
     * @param medianRainMm  rainfall at the 50th percentile of the baseline (mm)
     * @return true if the plot rain is between the trigger and the median
     */
    public static boolean lowLocalRain(
            double seasonRainMm,
            double triggerRainMm,
            double medianRainMm) {
        return seasonRainMm >= triggerRainMm && seasonRainMm < medianRainMm;
    }

    // ── §3  Satellite Stress Cut-Off ─────────────────────────────────────────

    /**
     * Evaluates the frozen satellite vegetation stress rule.
     * <p>
     * Returns {@code true} when the Sentinel-2 seasonal NDVI anomaly z-score
     * is <b>strictly below</b> −1.0 standard deviations against the county
     * and season baseline.
     *
     * @param ndviAnomalyZ NDVI anomaly z-score (negative = stress)
     * @return true if the satellite detects significant vegetation stress
     */
    public static boolean satelliteStress(double ndviAnomalyZ) {
        return ndviAnomalyZ < FROZEN_NDVI_STRESS_CUTOFF_Z;
    }
}
