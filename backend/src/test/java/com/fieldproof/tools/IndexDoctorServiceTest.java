package com.fieldproof.tools;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.api.dto.Contracts.*;
import com.fieldproof.tools.IndexDoctorService.*;

import org.junit.jupiter.api.*;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * JUnit 5 tests for FieldProof's Index Doctor simulation service.
 * <p>
 * Verifies:
 * <ol>
 *   <li>Wanjiru's P-0142 is a PHENOLOGICAL_BASIS_RISK_GAP at the frozen 30th percentile</li>
 *   <li>Slider monotonicity: raising percentile increases payouts, decreases gaps</li>
 *   <li>Flipping P-0142 from gap to CONFIRMED_PAYOUT at high enough percentile</li>
 *   <li>Recalibration recommendations fire for counties with clustered gaps</li>
 *   <li>Contract structure and disclaimer compliance</li>
 * </ol>
 */
class IndexDoctorServiceTest {

    private final IndexDoctorService service = new IndexDoctorService();

    // ═════════════════════════════════════════════════════════════════════════
    // 1. Wanjiru's P-0142 at Frozen 30th Percentile
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Wanjiru P-0142 — frozen 30th percentile evaluation")
    class WanjuriP0142Tests {

        @Test
        @DisplayName("P-0142 (341mm vs 290mm p30 trigger) → PHENOLOGICAL_BASIS_RISK_GAP in Embu")
        void p0142_phenologicalGap_atP30() {
            List<PlotEvaluation> evals = service.evaluatePlots(30);

            Optional<PlotEvaluation> wanjiru = evals.stream()
                .filter(e -> "P-0142".equals(e.plot().plotId()))
                .findFirst();

            assertTrue(wanjiru.isPresent(), "P-0142 should be in test dataset");

            PlotEvaluation eval = wanjiru.get();
            assertEquals("Embu", eval.plot().county());
            assertEquals("Long Rains", eval.plot().season());
            assertEquals(341.0, eval.plot().seasonRainMm());

            // At p30, trigger is 290mm → 341 >= 290 → index does NOT pay
            assertFalse(eval.indexPays(), "341mm >= 290mm trigger → index should NOT pay");

            // Photo-damaged (SEVERE + agreed)
            assertTrue(eval.photoDamaged(), "SEVERE + agreed → photo-damaged");

            // Concordance outcome
            assertEquals(OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP, eval.outcomeClass(),
                "P-0142 should be classified as PHENOLOGICAL_BASIS_RISK_GAP at p30");
        }

        @Test
        @DisplayName("P-0142 trigger threshold is 290mm at p30 for Embu Long Rains")
        void p0142_triggerThreshold_atP30() {
            List<PlotEvaluation> evals = service.evaluatePlots(30);

            PlotEvaluation wanjiru = evals.stream()
                .filter(e -> "P-0142".equals(e.plot().plotId()))
                .findFirst().orElseThrow();

            assertEquals(290.0, wanjiru.triggerRainMm(), 0.01,
                "Embu Long Rains p30 trigger should be 290mm");
        }

        @Test
        @DisplayName("P-0142 is counted in Embu county's gap_count at p30")
        void p0142_inEmbuGapCount() {
            IndexDoctorSimulation sim = service.simulate(30);

            CountyStats embu = sim.countyBreakdown().stream()
                .filter(c -> "Embu".equals(c.county()))
                .findFirst().orElseThrow();

            assertTrue(embu.gapCount() > 0,
                "Embu should have basis-risk gaps at p30");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. Slider Monotonicity — Raising Percentile
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Slider monotonicity — percentile 20 → 30 → 45")
    class MonotonicityTests {

        @Test
        @DisplayName("payout_frequency monotonically increases or stays equal as percentile rises")
        void payoutFrequency_monotonicallyIncreases() {
            IndexDoctorSimulation sim20 = service.simulate(20);
            IndexDoctorSimulation sim30 = service.simulate(30);
            IndexDoctorSimulation sim45 = service.simulate(45);

            assertTrue(sim30.payoutFrequency() >= sim20.payoutFrequency(),
                "p30 payout_frequency (" + sim30.payoutFrequency()
                + ") should be >= p20 (" + sim20.payoutFrequency() + ")");

            assertTrue(sim45.payoutFrequency() >= sim30.payoutFrequency(),
                "p45 payout_frequency (" + sim45.payoutFrequency()
                + ") should be >= p30 (" + sim30.payoutFrequency() + ")");
        }

        @Test
        @DisplayName("illustrative_payout_usd monotonically increases as percentile rises")
        void payoutUsd_monotonicallyIncreases() {
            IndexDoctorSimulation sim20 = service.simulate(20);
            IndexDoctorSimulation sim30 = service.simulate(30);
            IndexDoctorSimulation sim45 = service.simulate(45);

            assertTrue(sim30.illustrativePayoutTotalUsd() >= sim20.illustrativePayoutTotalUsd(),
                "p30 payout USD should be >= p20");

            assertTrue(sim45.illustrativePayoutTotalUsd() >= sim30.illustrativePayoutTotalUsd(),
                "p45 payout USD should be >= p30");
        }

        @Test
        @DisplayName("gap_rate monotonically decreases or stays equal as percentile rises")
        void gapRate_monotonicallyDecreases() {
            IndexDoctorSimulation sim20 = service.simulate(20);
            IndexDoctorSimulation sim30 = service.simulate(30);
            IndexDoctorSimulation sim45 = service.simulate(45);

            assertTrue(sim30.gapRate() <= sim20.gapRate(),
                "p30 gap_rate (" + sim30.gapRate()
                + ") should be <= p20 (" + sim20.gapRate() + ")");

            assertTrue(sim45.gapRate() <= sim30.gapRate(),
                "p45 gap_rate (" + sim45.gapRate()
                + ") should be <= p30 (" + sim30.gapRate() + ")");
        }

        @Test
        @DisplayName("overpayment_rate monotonically increases or stays equal as percentile rises")
        void overpaymentRate_monotonicallyIncreases() {
            IndexDoctorSimulation sim20 = service.simulate(20);
            IndexDoctorSimulation sim30 = service.simulate(30);
            IndexDoctorSimulation sim45 = service.simulate(45);

            assertTrue(sim30.overpaymentRate() >= sim20.overpaymentRate(),
                "p30 overpayment_rate should be >= p20");

            assertTrue(sim45.overpaymentRate() >= sim30.overpaymentRate(),
                "p45 overpayment_rate should be >= p30");
        }

        @Test
        @DisplayName("Comprehensive monotonicity across full range (p10 to p55, step 5)")
        void fullRange_monotonicity() {
            IndexDoctorSimulation prev = service.simulate(10);

            for (int p = 15; p <= 55; p += 5) {
                IndexDoctorSimulation curr = service.simulate(p);

                assertTrue(curr.payoutFrequency() >= prev.payoutFrequency(),
                    "payout_frequency at p" + p + " (" + curr.payoutFrequency()
                    + ") < p" + (p - 5) + " (" + prev.payoutFrequency() + ")");

                assertTrue(curr.gapRate() <= prev.gapRate(),
                    "gap_rate at p" + p + " (" + curr.gapRate()
                    + ") > p" + (p - 5) + " (" + prev.gapRate() + ")");

                assertTrue(curr.illustrativePayoutTotalUsd()
                        >= prev.illustrativePayoutTotalUsd(),
                    "payout USD at p" + p + " < p" + (p - 5));

                prev = curr;
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3. Flipping P-0142 to CONFIRMED_PAYOUT at High Percentile
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Slider high enough → P-0142 flips to CONFIRMED_PAYOUT")
    class FlipToPayoutTests {

        @Test
        @DisplayName("At percentile where trigger > 341mm, P-0142 becomes CONFIRMED_PAYOUT")
        void p0142_flipsToConfirmedPayout() {
            // Find the percentile where the Embu Long Rains trigger exceeds 341mm
            // From the distribution: p45 = 350mm > 341mm, so at p45 the index pays
            List<PlotEvaluation> evals45 = service.evaluatePlots(45);

            PlotEvaluation wanjiru45 = evals45.stream()
                .filter(e -> "P-0142".equals(e.plot().plotId()))
                .findFirst().orElseThrow();

            // At p45 (trigger = 350mm): 341 < 350 → index PAYS
            assertTrue(wanjiru45.indexPays(),
                "At p45, 341mm < 350mm trigger → index should pay");

            // PAYS + SEVERE damage → CONFIRMED_PAYOUT
            assertEquals(OutcomeClass.CONFIRMED_PAYOUT, wanjiru45.outcomeClass(),
                "P-0142 should flip to CONFIRMED_PAYOUT at p45");
        }

        @Test
        @DisplayName("P-0142 transition: gap at p30, still gap at p40, payout at p45")
        void p0142_transitionSequence() {
            // p30: trigger = 290mm → 341 >= 290 → gap
            PlotEvaluation atP30 = findPlot(service.evaluatePlots(30), "P-0142");
            assertEquals(OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP, atP30.outcomeClass());

            // p40: trigger = 330mm → 341 >= 330 → still gap
            PlotEvaluation atP40 = findPlot(service.evaluatePlots(40), "P-0142");
            assertEquals(OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP, atP40.outcomeClass());

            // p45: trigger = 350mm → 341 < 350 → CONFIRMED_PAYOUT
            PlotEvaluation atP45 = findPlot(service.evaluatePlots(45), "P-0142");
            assertEquals(OutcomeClass.CONFIRMED_PAYOUT, atP45.outcomeClass());
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 4. Recalibration Recommendations
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Recalibration recommendations for clustered gaps")
    class RecalibrationTests {

        @Test
        @DisplayName("Embu gets recalibration recommendation at p30 (phenological gaps cluster)")
        void embu_recalibrationRecommendation() {
            List<RecalibrationRecommendation> recs =
                service.getRecalibrationRecommendations(30);

            Optional<RecalibrationRecommendation> embuRec = recs.stream()
                .filter(r -> "Embu".equals(r.county()))
                .findFirst();

            assertTrue(embuRec.isPresent(),
                "Embu should have a recalibration recommendation at p30");
            assertTrue(embuRec.get().phenologicalGapCount() > 0);
            assertTrue(embuRec.get().recommendation().contains("flowering-window"),
                "Recommendation should mention flowering-window sub-trigger");
        }

        @Test
        @DisplayName("No phenological gap recommendations at very high percentile (all paid)")
        void noGaps_atHighPercentile() {
            // At p60, most plots should be paid → fewer or no gaps
            List<RecalibrationRecommendation> recs =
                service.getRecalibrationRecommendations(60);

            // If Embu has a rec, its gap count should be less than at p30
            List<RecalibrationRecommendation> recsP30 =
                service.getRecalibrationRecommendations(30);

            int totalGapsP60 = recs.stream()
                .mapToInt(RecalibrationRecommendation::phenologicalGapCount).sum();
            int totalGapsP30 = recsP30.stream()
                .mapToInt(RecalibrationRecommendation::phenologicalGapCount).sum();

            assertTrue(totalGapsP60 <= totalGapsP30,
                "Gap count at p60 should be <= p30");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5. Simulation Structure & Disclaimer
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Simulation structure and contract compliance")
    class StructureTests {

        @Test
        @DisplayName("simulate(30) returns valid IndexDoctorSimulation")
        void validSimulationStructure() {
            IndexDoctorSimulation sim = service.simulate(30);

            assertEquals(30, sim.triggerPercentile());
            assertTrue(sim.totalPlots() > 0, "Should have test plots");
            assertTrue(sim.triggerRainMmMedian() > 0, "Median trigger should be > 0");
            assertEquals(100.0, sim.flatPayoutPerPlotUsd(), "Flat payout should be $100");
            assertEquals(sim.payoutCount() * 100.0, sim.illustrativePayoutTotalUsd(),
                "Total USD should be payout_count × $100");
            assertNotNull(sim.countyBreakdown());
            assertNotNull(sim.seasonBreakdown());
            assertNotNull(sim.computedAtUtc());

            // Rates should be between 0 and 1
            assertTrue(sim.payoutFrequency() >= 0 && sim.payoutFrequency() <= 1);
            assertTrue(sim.gapRate() >= 0 && sim.gapRate() <= 1);
            assertTrue(sim.overpaymentRate() >= 0 && sim.overpaymentRate() <= 1);
        }

        @Test
        @DisplayName("County breakdown includes all 5 counties")
        void countyBreakdown_allCounties() {
            IndexDoctorSimulation sim = service.simulate(30);

            List<String> counties = sim.countyBreakdown().stream()
                .map(CountyStats::county)
                .sorted()
                .toList();

            assertTrue(counties.contains("Embu"), "Should include Embu");
            assertTrue(counties.contains("Machakos"), "Should include Machakos");
            assertTrue(counties.contains("Kirinyaga"), "Should include Kirinyaga");
            assertTrue(counties.contains("Nakuru"), "Should include Nakuru");
            assertTrue(counties.contains("Bungoma"), "Should include Bungoma");
        }

        @Test
        @DisplayName("Season breakdown includes Long Rains and Short Rains")
        void seasonBreakdown_bothSeasons() {
            IndexDoctorSimulation sim = service.simulate(30);

            List<String> seasons = sim.seasonBreakdown().stream()
                .map(SeasonStats::season)
                .toList();

            assertTrue(seasons.contains("Long Rains"));
            assertTrue(seasons.contains("Short Rains"));
        }

        @Test
        @DisplayName("Total plots across county breakdown sums to total_plots")
        void countyBreakdown_sumsToTotal() {
            IndexDoctorSimulation sim = service.simulate(30);

            int countySum = sim.countyBreakdown().stream()
                .mapToInt(CountyStats::totalPlots)
                .sum();

            assertEquals(sim.totalPlots(), countySum,
                "County breakdown total should sum to overall total");
        }

        @Test
        @DisplayName("Disclaimer matches spec requirement")
        void disclaimer() {
            assertTrue(IndexDoctorService.DISCLAIMER.contains("$100 USD"),
                "Disclaimer should mention $100 USD");
            assertTrue(IndexDoctorService.DISCLAIMER.contains("not actuarial pricing advice"),
                "Disclaimer should include actuarial disclaimer");
        }

        @Test
        @DisplayName("Percentile out of range throws IllegalArgumentException")
        void invalidPercentile() {
            assertThrows(IllegalArgumentException.class,
                () -> service.simulate(0));
            assertThrows(IllegalArgumentException.class,
                () -> service.simulate(4));
            assertThrows(IllegalArgumentException.class,
                () -> service.simulate(61));
            assertThrows(IllegalArgumentException.class,
                () -> service.simulate(100));
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 6. Dataset Integrity
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Test dataset integrity")
    class DatasetTests {

        @Test
        @DisplayName("Default dataset contains 24 test plots")
        void datasetSize() {
            assertEquals(24, service.getTestPlots().size());
        }

        @Test
        @DisplayName("P-0142 has correct attributes (Wanjiru headline case)")
        void p0142_attributes() {
            TestPlot p0142 = service.getTestPlots().stream()
                .filter(p -> "P-0142".equals(p.plotId()))
                .findFirst().orElseThrow();

            assertEquals("Embu", p0142.county());
            assertEquals("Long Rains", p0142.season());
            assertEquals(341.0, p0142.seasonRainMm());
            assertEquals(Contracts.SeverityBand.SEVERE, p0142.severityBand());
            assertTrue(p0142.passesAgreed());
            assertEquals(DamageType.drought, p0142.damageType());
            assertTrue(p0142.satelliteStress());
            assertTrue(p0142.drySpellOverlapsCriticalStage());
            assertEquals(21, p0142.maxDrySpellDays());
        }

        @Test
        @DisplayName("Dataset spans 5 counties")
        void datasetCounties() {
            long distinctCounties = service.getTestPlots().stream()
                .map(TestPlot::county)
                .distinct()
                .count();
            assertEquals(5, distinctCounties);
        }

        @Test
        @DisplayName("Dataset spans 2 seasons")
        void datasetSeasons() {
            long distinctSeasons = service.getTestPlots().stream()
                .map(TestPlot::season)
                .distinct()
                .count();
            assertEquals(2, distinctSeasons);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 7. Performance
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Performance — slider must run in < 5 ms")
    class PerformanceTests {

        @Test
        @DisplayName("simulate(30) completes in < 5 ms (after warmup)")
        void performanceUnder5ms() {
            // Warmup
            for (int i = 0; i < 100; i++) {
                service.simulate(30);
            }

            // Measure
            long start = System.nanoTime();
            int iterations = 1000;
            for (int i = 0; i < iterations; i++) {
                service.simulate(30);
            }
            long elapsed = System.nanoTime() - start;
            double avgMs = (elapsed / 1_000_000.0) / iterations;

            assertTrue(avgMs < 5.0,
                "Average simulation time should be < 5ms, was " + avgMs + "ms");
        }
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private static PlotEvaluation findPlot(List<PlotEvaluation> evals, String plotId) {
        return evals.stream()
            .filter(e -> plotId.equals(e.plot().plotId()))
            .findFirst()
            .orElseThrow(() -> new AssertionError("Plot " + plotId + " not found"));
    }
}
