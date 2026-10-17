package com.fieldproof.core;

import com.fieldproof.api.dto.Contracts.SeverityBand;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ForensicsValidatorTest {

    @Test
    void testPassesWhenAllIntegrityClear() {
        CoreContracts.HashReport hash = new CoreContracts.HashReport(true, false, false, null, List.of(), List.of());
        ForensicsValidator.ForensicsDecision d = ForensicsValidator.validate(hash, true, true, false, SeverityBand.MODERATE);

        assertTrue(d.integrityOk());
        assertEquals(SeverityBand.MODERATE, d.effectiveBand());
    }

    @Test
    void testRejectsWhenNotCropField() {
        CoreContracts.HashReport hash = new CoreContracts.HashReport(true, false, false, null, List.of(), List.of());
        ForensicsValidator.ForensicsDecision d = ForensicsValidator.validate(hash, false, true, false, SeverityBand.SEVERE);

        assertFalse(d.integrityOk());
        assertEquals(SeverityBand.ABSTAIN, d.effectiveBand());
        assertTrue(d.reason().contains("does not depict an agricultural crop field"));
    }

    @Test
    void testRejectsWhenScreenRecaptureSuspected() {
        CoreContracts.HashReport hash = new CoreContracts.HashReport(true, false, false, null, List.of(), List.of());
        ForensicsValidator.ForensicsDecision d = ForensicsValidator.validate(hash, true, true, true, SeverityBand.SEVERE);

        assertFalse(d.integrityOk());
        assertTrue(d.reason().contains("Suspected photographed computer/phone screen"));
    }

    @Test
    void testRejectsWhenHashFailsEvenIfModelSaidAllClear() {
        CoreContracts.HashReport hash = new CoreContracts.HashReport(false, true, false, null, List.of(0), List.of("duplicate_detected"));
        // Model says isCropField=true, sameField=true, screenRecapture=false
        ForensicsValidator.ForensicsDecision d = ForensicsValidator.validate(hash, true, true, false, SeverityBand.SEVERE);

        assertFalse(d.integrityOk());
        assertEquals(SeverityBand.ABSTAIN, d.effectiveBand());
        assertTrue(d.reason().contains("Duplicate or near-duplicate"));
    }
}
