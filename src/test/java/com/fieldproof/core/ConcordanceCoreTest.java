package com.fieldproof.core;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.api.dto.Contracts.DamageType;
import com.fieldproof.api.dto.Contracts.OutcomeClass;
import com.fieldproof.api.dto.Contracts.RecommendedAction;
import com.fieldproof.core.ConcordanceTable.ConcordanceResult;
import com.fieldproof.core.SeverityBand.AgreementResult;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Comprehensive JUnit 5 tests for FieldProof's deterministic decision core.
 * <p>
 * Verifies SeverityBand mapping, two-pass agreement gate, TriggerRule boundary
 * conditions, and every single row of the ConcordanceTable — including Wanjiru's
 * headline plot P-0142.
 * <p>
 * These tests prove that tested code — never the model — decides severity bands,
 * index triggers, and concordance outcomes.
 */
class ConcordanceCoreTest {

    // ═════════════════════════════════════════════════════════════════════════
    // 1. SeverityBand — Sign-Vector Mapping (FROZEN_TRIGGER_PROTOCOL §5.2)
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("SeverityBand.fromSigns — deterministic sign-to-band mapping")
    class SeverityBandMappingTests {

        @Test
        @DisplayName("NONE — all zeros, no cracking")
        void none_allZerosNoCracking() {
            assertEquals(Contracts.SeverityBand.NONE,
                    SeverityBand.fromSigns(0, 0, 0, false));
        }

        @Test
        @DisplayName("MILD — exactly one sign = 1, no cracking")
        void mild_oneSignAtOne() {
            assertEquals(Contracts.SeverityBand.MILD,
                    SeverityBand.fromSigns(1, 0, 0, false));
            assertEquals(Contracts.SeverityBand.MILD,
                    SeverityBand.fromSigns(0, 1, 0, false));
            assertEquals(Contracts.SeverityBand.MILD,
                    SeverityBand.fromSigns(0, 0, 1, false));
        }

        @Test
        @DisplayName("MILD — soil cracking only (no sign scores)")
        void mild_soilCrackingOnly() {
            assertEquals(Contracts.SeverityBand.MILD,
                    SeverityBand.fromSigns(0, 0, 0, true));
        }

        @Test
        @DisplayName("MODERATE — exactly one sign ≥ 2")
        void moderate_oneSignGeTwo() {
            assertEquals(Contracts.SeverityBand.MODERATE,
                    SeverityBand.fromSigns(2, 0, 0, false));
            assertEquals(Contracts.SeverityBand.MODERATE,
                    SeverityBand.fromSigns(0, 2, 0, false));
            assertEquals(Contracts.SeverityBand.MODERATE,
                    SeverityBand.fromSigns(0, 0, 3, false));
        }

        @Test
        @DisplayName("MODERATE — two signs ≥ 1 with soil cracking")
        void moderate_twoSignsWithCracking() {
            assertEquals(Contracts.SeverityBand.MODERATE,
                    SeverityBand.fromSigns(1, 1, 0, true));
            assertEquals(Contracts.SeverityBand.MODERATE,
                    SeverityBand.fromSigns(1, 0, 1, true));
        }

        @Test
        @DisplayName("MODERATE — all three signs ≥ 1")
        void moderate_allThreeGeOne() {
            assertEquals(Contracts.SeverityBand.MODERATE,
                    SeverityBand.fromSigns(1, 1, 1, false));
        }

        @Test
        @DisplayName("SEVERE — at least two signs ≥ 2")
        void severe_twoSignsGeTwo() {
            assertEquals(Contracts.SeverityBand.SEVERE,
                    SeverityBand.fromSigns(2, 2, 0, false));
            assertEquals(Contracts.SeverityBand.SEVERE,
                    SeverityBand.fromSigns(3, 2, 0, false));
            assertEquals(Contracts.SeverityBand.SEVERE,
                    SeverityBand.fromSigns(2, 2, 2, true));
        }

        @Test
        @DisplayName("SEVERE — any sign = 3 with soil cracking")
        void severe_signAtThreeWithCracking() {
            assertEquals(Contracts.SeverityBand.SEVERE,
                    SeverityBand.fromSigns(3, 0, 0, true));
            assertEquals(Contracts.SeverityBand.SEVERE,
                    SeverityBand.fromSigns(0, 3, 0, true));
            assertEquals(Contracts.SeverityBand.SEVERE,
                    SeverityBand.fromSigns(0, 0, 3, true));
        }

        @Test
        @DisplayName("SEVERE — Wanjiru's plot P-0142: leaf=3, canopy=2, stunt=1, cracking=true")
        void severe_wanjiru_P0142() {
            // Two signs ≥ 2 (leaf_rolling=3, canopy_senescence=2), so SEVERE
            assertEquals(Contracts.SeverityBand.SEVERE,
                    SeverityBand.fromSigns(3, 2, 1, true));
        }

        @Test
        @DisplayName("fromSigns rejects sign scores outside 0–3")
        void rejects_outOfRange() {
            assertThrows(IllegalArgumentException.class,
                    () -> SeverityBand.fromSigns(-1, 0, 0, false));
            assertThrows(IllegalArgumentException.class,
                    () -> SeverityBand.fromSigns(0, 4, 0, false));
        }

        @Test
        @DisplayName("fromSigns(Signs DTO) convenience overload works")
        void fromSigns_dtoOverload() {
            var signs = new Contracts.Signs(3, 2, 1, true);
            assertEquals(Contracts.SeverityBand.SEVERE,
                    SeverityBand.fromSigns(signs));
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. SeverityBand — Two-Pass Agreement Gate (FROZEN_TRIGGER_PROTOCOL §5.3)
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("SeverityBand.agree — two-pass agreement gate")
    class AgreementGateTests {

        @Test
        @DisplayName("Both passes agree → passesAgreed=true, same band returned")
        void agree_sameBand() {
            for (Contracts.SeverityBand band : new Contracts.SeverityBand[]{
                    Contracts.SeverityBand.NONE,
                    Contracts.SeverityBand.MILD,
                    Contracts.SeverityBand.MODERATE,
                    Contracts.SeverityBand.SEVERE}) {

                AgreementResult result = SeverityBand.agree(band, band);
                assertTrue(result.passesAgreed(), "Expected agreement for " + band);
                assertFalse(result.abstainToHuman());
                assertEquals(band, result.finalBand());
            }
        }

        @Test
        @DisplayName("Passes disagree → ABSTAIN, abstainToHuman=true")
        void disagree_abstain() {
            AgreementResult result = SeverityBand.agree(
                    Contracts.SeverityBand.MODERATE,
                    Contracts.SeverityBand.SEVERE);
            assertFalse(result.passesAgreed());
            assertTrue(result.abstainToHuman());
            assertEquals(Contracts.SeverityBand.ABSTAIN, result.finalBand());
        }

        @Test
        @DisplayName("MILD vs MODERATE disagree → ABSTAIN")
        void disagree_mildVsModerate() {
            AgreementResult result = SeverityBand.agree(
                    Contracts.SeverityBand.MILD,
                    Contracts.SeverityBand.MODERATE);
            assertFalse(result.passesAgreed());
            assertTrue(result.abstainToHuman());
            assertEquals(Contracts.SeverityBand.ABSTAIN, result.finalBand());
        }

        @Test
        @DisplayName("NONE vs SEVERE disagree → ABSTAIN")
        void disagree_noneVsSevere() {
            AgreementResult result = SeverityBand.agree(
                    Contracts.SeverityBand.NONE,
                    Contracts.SeverityBand.SEVERE);
            assertTrue(result.abstainToHuman());
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3. SeverityBand.isPhotoDamaged (FROZEN_TRIGGER_PROTOCOL §5.4)
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("SeverityBand.isPhotoDamaged — photo-damaged criterion")
    class PhotoDamagedTests {

        @Test
        @DisplayName("SEVERE + agreed → photo-damaged")
        void photoDamaged_severe() {
            assertTrue(SeverityBand.isPhotoDamaged(Contracts.SeverityBand.SEVERE, true));
        }

        @Test
        @DisplayName("MODERATE + agreed → photo-damaged")
        void photoDamaged_moderate() {
            assertTrue(SeverityBand.isPhotoDamaged(Contracts.SeverityBand.MODERATE, true));
        }

        @Test
        @DisplayName("MILD + agreed → NOT photo-damaged")
        void notPhotoDamaged_mild() {
            assertFalse(SeverityBand.isPhotoDamaged(Contracts.SeverityBand.MILD, true));
        }

        @Test
        @DisplayName("NONE + agreed → NOT photo-damaged")
        void notPhotoDamaged_none() {
            assertFalse(SeverityBand.isPhotoDamaged(Contracts.SeverityBand.NONE, true));
        }

        @Test
        @DisplayName("SEVERE but NOT agreed → NOT photo-damaged")
        void notPhotoDamaged_notAgreed() {
            assertFalse(SeverityBand.isPhotoDamaged(Contracts.SeverityBand.SEVERE, false));
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 4. TriggerRule — Boundary Conditions (FROZEN_TRIGGER_PROTOCOL §2, §3)
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("TriggerRule — frozen index trigger and satellite stress")
    class TriggerRuleTests {

        // ── §2: indexPays ────────────────────────────────────────────────────

        @Test
        @DisplayName("indexPays: rain strictly below trigger → true")
        void indexPays_belowTrigger() {
            assertTrue(TriggerRule.indexPays(250.0, 290.0));
        }

        @Test
        @DisplayName("indexPays: rain exactly at trigger → false (not strictly below)")
        void indexPays_exactlyAtTrigger() {
            assertFalse(TriggerRule.indexPays(290.0, 290.0));
        }

        @Test
        @DisplayName("indexPays: rain above trigger → false")
        void indexPays_aboveTrigger() {
            assertFalse(TriggerRule.indexPays(341.0, 290.0));
        }

        @Test
        @DisplayName("indexPays: Wanjiru P-0142 — 341mm vs 290mm → false")
        void indexPays_wanjuru_P0142() {
            assertFalse(TriggerRule.indexPays(341.0, 290.0));
        }

        @Test
        @DisplayName("indexPays: boundary — rain = trigger - 0.001 → true")
        void indexPays_justBelowTrigger() {
            assertTrue(TriggerRule.indexPays(289.999, 290.0));
        }

        // ── §2.2: lowLocalRain ───────────────────────────────────────────────

        @Test
        @DisplayName("lowLocalRain: between trigger and median → true")
        void lowLocalRain_betweenTriggerAndMedian() {
            assertTrue(TriggerRule.lowLocalRain(341.0, 290.0, 400.0));
        }

        @Test
        @DisplayName("lowLocalRain: below trigger → false (index pays instead)")
        void lowLocalRain_belowTrigger() {
            assertFalse(TriggerRule.lowLocalRain(250.0, 290.0, 400.0));
        }

        @Test
        @DisplayName("lowLocalRain: above median → false")
        void lowLocalRain_aboveMedian() {
            assertFalse(TriggerRule.lowLocalRain(420.0, 290.0, 400.0));
        }

        // ── §3: satelliteStress ──────────────────────────────────────────────

        @Test
        @DisplayName("satelliteStress: z = -1.9 → true (strictly below -1.0)")
        void satelliteStress_wellBelow() {
            assertTrue(TriggerRule.satelliteStress(-1.9));
        }

        @Test
        @DisplayName("satelliteStress: z = -1.0 → false (not strictly below)")
        void satelliteStress_exactlyAtCutoff() {
            assertFalse(TriggerRule.satelliteStress(-1.0));
        }

        @Test
        @DisplayName("satelliteStress: z = -0.5 → false")
        void satelliteStress_aboveCutoff() {
            assertFalse(TriggerRule.satelliteStress(-0.5));
        }

        @Test
        @DisplayName("satelliteStress: z = -1.001 → true (just below cutoff)")
        void satelliteStress_justBelowCutoff() {
            assertTrue(TriggerRule.satelliteStress(-1.001));
        }

        @Test
        @DisplayName("satelliteStress: z = 0.0 → false (healthy vegetation)")
        void satelliteStress_healthy() {
            assertFalse(TriggerRule.satelliteStress(0.0));
        }

        // ── Frozen constants ─────────────────────────────────────────────────

        @Test
        @DisplayName("Frozen trigger percentile is 30")
        void frozenPercentile() {
            assertEquals(30, TriggerRule.FROZEN_TRIGGER_PERCENTILE);
        }

        @Test
        @DisplayName("Frozen NDVI stress cutoff is -1.0")
        void frozenNdviCutoff() {
            assertEquals(-1.0, TriggerRule.FROZEN_NDVI_STRESS_CUTOFF_Z);
        }

        @Test
        @DisplayName("Frozen illustrative payout is $100 USD")
        void frozenPayout() {
            assertEquals(100.0, TriggerRule.ILLUSTRATIVE_PAYOUT_USD);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5. ConcordanceTable — Every Row (FROZEN_TRIGGER_PROTOCOL §7)
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("ConcordanceTable — three-signal concordance decision table")
    class ConcordanceTableTests {

        // ── Row 1: CONFIRMED_PAYOUT (CL-2.1) ────────────────────────────────

        @Test
        @DisplayName("Row 1: Pays + Damage + Any satellite → CONFIRMED_PAYOUT (CL-2.1)")
        void row1_confirmedPayout() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true,   // integrityPassed
                    false,  // abstainToHuman
                    Contracts.SeverityBand.SEVERE,
                    DamageType.drought,
                    true,   // indexPays
                    true,   // satelliteStress (Any)
                    true,   // drySpellOverlaps (Any)
                    false); // lowLocalRain

            assertEquals(OutcomeClass.CONFIRMED_PAYOUT, r.outcomeClass());
            assertEquals(RecommendedAction.FAST_TRACK, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-2.1"));
        }

        @Test
        @DisplayName("Row 1 variant: Pays + MODERATE damage + no satellite stress")
        void row1_confirmedPayout_moderate_noSatStress() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.MODERATE,
                    DamageType.drought,
                    true,   // indexPays
                    false,  // no satellite stress (Any satellite)
                    false, false);

            assertEquals(OutcomeClass.CONFIRMED_PAYOUT, r.outcomeClass());
            assertEquals(RecommendedAction.FAST_TRACK, r.recommendedAction());
        }

        // ── Row 2: POSSIBLE_OVERPAYMENT (CL-2.2) ────────────────────────────

        @Test
        @DisplayName("Row 2: Pays + No damage → POSSIBLE_OVERPAYMENT (CL-2.2)")
        void row2_possibleOverpayment() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.NONE,
                    DamageType.none,
                    true,   // indexPays
                    false, false, false);

            assertEquals(OutcomeClass.POSSIBLE_OVERPAYMENT, r.outcomeClass());
            assertEquals(RecommendedAction.REVIEW, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-2.2"));
        }

        @Test
        @DisplayName("Row 2 variant: Pays + MILD damage → still POSSIBLE_OVERPAYMENT")
        void row2_possibleOverpayment_mild() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.MILD,
                    DamageType.drought,
                    true,   // indexPays
                    true, true, true);

            assertEquals(OutcomeClass.POSSIBLE_OVERPAYMENT, r.outcomeClass());
        }

        // ── Row 3: PHENOLOGICAL_BASIS_RISK_GAP (CL-4.2) ─────────────────────

        @Test
        @DisplayName("Row 3: No pay + SEVERE + satellite stress + dry-spell overlap → PHENOLOGICAL_GAP (CL-4.2)")
        void row3_phenologicalGap() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.SEVERE,
                    DamageType.drought,
                    false,  // !indexPays
                    true,   // satelliteStress
                    true,   // drySpellOverlaps
                    true);  // lowLocalRain

            assertEquals(OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP, r.outcomeClass());
            assertEquals(RecommendedAction.ESCALATE, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-4.2"));
        }

        @Test
        @DisplayName("Row 3 — Wanjiru P-0142: 341mm>290mm, leaf=3/canopy=2/stunt=1/crack=true, NDVI=-1.9, 21-day flowering dry spell → PHENOLOGICAL_GAP")
        void row3_wanjiru_P0142_headlineCase() {
            // Step 1: Severity band from signs
            Contracts.SeverityBand band = SeverityBand.fromSigns(3, 2, 1, true);
            assertEquals(Contracts.SeverityBand.SEVERE, band);

            // Step 2: Two-pass agreement (both passes return SEVERE)
            AgreementResult agreement = SeverityBand.agree(band, band);
            assertTrue(agreement.passesAgreed());
            assertFalse(agreement.abstainToHuman());
            assertEquals(Contracts.SeverityBand.SEVERE, agreement.finalBand());

            // Step 3: Trigger rule — 341 mm vs 290 mm → index does NOT pay
            assertFalse(TriggerRule.indexPays(341.0, 290.0));

            // Step 4: Satellite stress — NDVI z = -1.9 → stressed
            assertTrue(TriggerRule.satelliteStress(-1.9));

            // Step 5: Full concordance
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true,                               // integrity passed
                    agreement.abstainToHuman(),          // false (passes agreed)
                    agreement.finalBand(),               // SEVERE
                    DamageType.drought,                  // weather damage
                    TriggerRule.indexPays(341.0, 290.0),  // false
                    TriggerRule.satelliteStress(-1.9),    // true
                    true,                                // 21-day dry spell overlaps flowering
                    true);                               // plot-level rain below median

            assertEquals(OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP, r.outcomeClass());
            assertEquals(RecommendedAction.ESCALATE, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-4.2"));
            assertNotNull(r.failureMode());
            assertFalse(r.failureMode().isBlank());
        }

        // ── Row 4: SPATIAL_BASIS_RISK_GAP (CL-4.3) ──────────────────────────

        @Test
        @DisplayName("Row 4: No pay + MODERATE + satellite stress + no overlap + low rain → SPATIAL_GAP (CL-4.3)")
        void row4_spatialGap() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.MODERATE,
                    DamageType.drought,
                    false,  // !indexPays
                    true,   // satelliteStress
                    false,  // !drySpellOverlaps
                    true);  // lowLocalRain

            assertEquals(OutcomeClass.SPATIAL_BASIS_RISK_GAP, r.outcomeClass());
            assertEquals(RecommendedAction.ESCALATE, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-4.3"));
        }

        // ── Row 5: EVIDENCE_CONFLICT (CL-5.1) ───────────────────────────────

        @Test
        @DisplayName("Row 5: No pay + SEVERE drought + satellite healthy → EVIDENCE_CONFLICT (CL-5.1)")
        void row5_evidenceConflict() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.SEVERE,
                    DamageType.drought,
                    false,  // !indexPays
                    false,  // !satelliteStress (satellite healthy)
                    true,   // drySpellOverlaps (doesn't matter)
                    false);

            assertEquals(OutcomeClass.EVIDENCE_CONFLICT, r.outcomeClass());
            assertEquals(RecommendedAction.ASK_MORE_PHOTOS_HUMAN_REVIEW, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-5.1"));
        }

        // ── Row 6: CONSISTENT (CL-1.1) ──────────────────────────────────────

        @Test
        @DisplayName("Row 6: No pay + No damage + satellite healthy → CONSISTENT (CL-1.1)")
        void row6_consistent() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.NONE,
                    DamageType.none,
                    false,  // !indexPays
                    false,  // !satelliteStress
                    false, false);

            assertEquals(OutcomeClass.CONSISTENT, r.outcomeClass());
            assertEquals(RecommendedAction.NO_ACTION, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-1.1"));
        }

        @Test
        @DisplayName("Row 6 variant: No pay + MILD damage → CONSISTENT (MILD is below photo-damaged threshold)")
        void row6_consistent_mild() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.MILD,
                    DamageType.drought,
                    false, false, false, false);

            assertEquals(OutcomeClass.CONSISTENT, r.outcomeClass());
        }

        // ── Row 7: NON_WEATHER_LOSS (CL-6.1) ────────────────────────────────

        @Test
        @DisplayName("Row 7: Pest damage → NON_WEATHER_LOSS (CL-6.1)")
        void row7_nonWeather_pest() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.MODERATE,
                    DamageType.pest,
                    false, true, true, true);

            assertEquals(OutcomeClass.NON_WEATHER_LOSS, r.outcomeClass());
            assertEquals(RecommendedAction.ROUTE_TO_ADVISORY, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-6.1"));
        }

        @Test
        @DisplayName("Row 7 variant: Disease damage → NON_WEATHER_LOSS")
        void row7_nonWeather_disease() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.SEVERE,
                    DamageType.disease,
                    true, true, true, true);

            assertEquals(OutcomeClass.NON_WEATHER_LOSS, r.outcomeClass());
        }

        @Test
        @DisplayName("Row 7 variant: Weed damage → NON_WEATHER_LOSS")
        void row7_nonWeather_weed() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.MODERATE,
                    DamageType.weed,
                    false, false, false, false);

            assertEquals(OutcomeClass.NON_WEATHER_LOSS, r.outcomeClass());
        }

        @Test
        @DisplayName("Row 7 variant: Nutrient damage → NON_WEATHER_LOSS")
        void row7_nonWeather_nutrient() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true, false,
                    Contracts.SeverityBand.MODERATE,
                    DamageType.nutrient,
                    false, false, false, false);

            assertEquals(OutcomeClass.NON_WEATHER_LOSS, r.outcomeClass());
        }

        // ── Row 8: INTEGRITY_HOLD (CL-8.1) ──────────────────────────────────

        @Test
        @DisplayName("Row 8: Integrity failed → INTEGRITY_HOLD (CL-8.1) — highest priority")
        void row8_integrityHold() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    false,  // !integrityPassed
                    false,
                    Contracts.SeverityBand.SEVERE,
                    DamageType.drought,
                    true, true, true, true);

            assertEquals(OutcomeClass.INTEGRITY_HOLD, r.outcomeClass());
            assertEquals(RecommendedAction.HOLD_NO_RECOMMENDATION, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-8.1"));
        }

        @Test
        @DisplayName("Row 8: Integrity failure overrides all other signals")
        void row8_integrityHold_overridesEverything() {
            // Even if every other signal says CONFIRMED_PAYOUT, integrity hold wins
            ConcordanceResult r = ConcordanceTable.evaluate(
                    false,  // !integrityPassed
                    true,   // abstainToHuman (should be overridden)
                    Contracts.SeverityBand.SEVERE,
                    DamageType.pest,
                    true, true, true, true);

            assertEquals(OutcomeClass.INTEGRITY_HOLD, r.outcomeClass());
        }

        // ── Row 9: ABSTAIN_TO_HUMAN (CL-7.1) ────────────────────────────────

        @Test
        @DisplayName("Row 9: Two-pass disagreement → ABSTAIN (CL-7.1)")
        void row9_abstainToHuman() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true,
                    true,   // abstainToHuman
                    Contracts.SeverityBand.ABSTAIN,
                    DamageType.drought,
                    false, true, true, true);

            assertEquals(OutcomeClass.ABSTAIN, r.outcomeClass());
            assertEquals(RecommendedAction.ABSTAIN_TO_HUMAN, r.recommendedAction());
            assertTrue(r.citedClauseIds().contains("CL-7.1"));
        }

        @Test
        @DisplayName("Row 9: Abstain overrides non-weather and concordance rows")
        void row9_abstain_overridesNonWeather() {
            ConcordanceResult r = ConcordanceTable.evaluate(
                    true,
                    true,   // abstainToHuman
                    Contracts.SeverityBand.ABSTAIN,
                    DamageType.pest,
                    true, true, true, true);

            // Abstain takes priority over NON_WEATHER_LOSS
            assertEquals(OutcomeClass.ABSTAIN, r.outcomeClass());
        }

        // ── Priority ordering tests ──────────────────────────────────────────

        @Test
        @DisplayName("Priority: integrity failure > abstain > non-weather > concordance")
        void priorityOrdering() {
            // Integrity beats everything
            assertEquals(OutcomeClass.INTEGRITY_HOLD,
                    ConcordanceTable.evaluate(false, true,
                            Contracts.SeverityBand.SEVERE, DamageType.pest,
                            true, true, true, true).outcomeClass());

            // Abstain beats non-weather
            assertEquals(OutcomeClass.ABSTAIN,
                    ConcordanceTable.evaluate(true, true,
                            Contracts.SeverityBand.ABSTAIN, DamageType.weed,
                            true, true, true, true).outcomeClass());

            // Non-weather beats concordance
            assertEquals(OutcomeClass.NON_WEATHER_LOSS,
                    ConcordanceTable.evaluate(true, false,
                            Contracts.SeverityBand.SEVERE, DamageType.pest,
                            true, true, true, true).outcomeClass());
        }

        // ── Failure mode descriptions are non-empty ─────────────────────────

        @Test
        @DisplayName("All outcomes produce non-blank failure mode descriptions")
        void failureModesNonBlank() {
            // Test a representative subset
            assertFalse(ConcordanceTable.evaluate(true, false,
                    Contracts.SeverityBand.SEVERE, DamageType.drought,
                    true, true, true, false).failureMode().isBlank());

            assertFalse(ConcordanceTable.evaluate(true, false,
                    Contracts.SeverityBand.NONE, DamageType.none,
                    false, false, false, false).failureMode().isBlank());
        }
    }
}
