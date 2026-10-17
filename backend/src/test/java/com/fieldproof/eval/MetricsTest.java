package com.fieldproof.eval;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class MetricsTest {

    @Test
    void testConfusionMatrixCalculations() {
        // 5 actual positives, 5 actual negatives
        List<Boolean> actual = List.of(true, true, true, true, false, false, false, false, true, false);
        List<Boolean> pred   = List.of(true, true, true, false, false, false, true, false, true, false);

        Metrics.ConfusionMatrix m = Metrics.compute(actual, pred);

        // TP = 4 (indices 0, 1, 2, 8)
        // FP = 1 (index 6)
        // TN = 4 (indices 4, 5, 7, 9)
        // FN = 1 (index 3)
        assertEquals(4, m.truePositives());
        assertEquals(1, m.falsePositives());
        assertEquals(4, m.trueNegatives());
        assertEquals(1, m.falseNegatives());

        assertEquals(0.8, m.precision(), 0.001);
        assertEquals(0.8, m.recall(), 0.001);
        assertEquals(0.8, m.f1(), 0.001);
        assertEquals(0.8, m.accuracy(), 0.001);
    }
}
