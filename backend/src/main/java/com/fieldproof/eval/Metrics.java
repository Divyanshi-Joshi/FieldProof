package com.fieldproof.eval;

import java.util.*;

/**
 * Pure Java evaluation metrics calculation (docs/DAY2 §T2.9 & Appendix A).
 * Computes confusion matrices, precision, recall, F1, catch rate, and false-escalation rate.
 */
public final class Metrics {

    private Metrics() {}

    public record ConfusionMatrix(
            int truePositives,
            int falsePositives,
            int trueNegatives,
            int falseNegatives
    ) {
        public double precision() {
            int denom = truePositives + falsePositives;
            return denom == 0 ? 0.0 : (double) truePositives / denom;
        }

        public double recall() {
            int denom = truePositives + falseNegatives;
            return denom == 0 ? 0.0 : (double) truePositives / denom;
        }

        public double f1() {
            double p = precision();
            double r = recall();
            return (p + r) == 0.0 ? 0.0 : 2.0 * (p * r) / (p + r);
        }

        public double accuracy() {
            int total = truePositives + falsePositives + trueNegatives + falseNegatives;
            return total == 0 ? 0.0 : (double) (truePositives + trueNegatives) / total;
        }
    }

    public record ArmSummary(
            String armId,
            String armName,
            ConfusionMatrix matrix,
            int naturalGapsCaught,
            int totalNaturalGaps,
            double falseEscalationRate,
            double abstainRate,
            long avgLatencyMs,
            double costPerClaimUsd
    ) {}

    public static ConfusionMatrix compute(List<Boolean> groundTruthDamaged, List<Boolean> predictedDamaged) {
        if (groundTruthDamaged.size() != predictedDamaged.size()) {
            throw new IllegalArgumentException("List lengths must match");
        }

        int tp = 0, fp = 0, tn = 0, fn = 0;
        for (int i = 0; i < groundTruthDamaged.size(); i++) {
            boolean actual = groundTruthDamaged.get(i);
            boolean pred = predictedDamaged.get(i);

            if (actual && pred) tp++;
            else if (!actual && pred) fp++;
            else if (!actual && !pred) tn++;
            else fn++;
        }
        return new ConfusionMatrix(tp, fp, tn, fn);
    }
}
