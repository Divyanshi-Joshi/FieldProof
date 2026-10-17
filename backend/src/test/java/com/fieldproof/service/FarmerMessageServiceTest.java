package com.fieldproof.service;

import com.fieldproof.api.dto.Contracts.OutcomeClass;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FarmerMessageServiceTest {

    @Test
    void testEnglishMessageWithDisclaimer() {
        FarmerMessageService service = new FarmerMessageService();
        String msg = service.getMessage(OutcomeClass.CONFIRMED_PAYOUT, List.of(), "en");

        assertNotNull(msg);
        assertTrue(msg.contains("fast-tracked for payout"));
        assertTrue(msg.contains("Status notification only"));
    }

    @Test
    void testHindiMessageWithDuplicateRejection() {
        FarmerMessageService service = new FarmerMessageService();
        String msg = service.getMessage(OutcomeClass.INTEGRITY_HOLD, List.of("DUPLICATE_WITHIN_CLAIM"), "hi");

        assertNotNull(msg);
        assertTrue(msg.contains("दावा रोका गया है"));
        assertTrue(msg.contains("एक ही फोटो दो बार अपलोड"));
    }

    @Test
    void testSwahiliMessageWithDisclaimer() {
        FarmerMessageService service = new FarmerMessageService();
        String msg = service.getMessage(OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP, List.of(), "sw");

        assertNotNull(msg);
        assertTrue(msg.contains("wakati wa kutoa maua"));
    }
}
