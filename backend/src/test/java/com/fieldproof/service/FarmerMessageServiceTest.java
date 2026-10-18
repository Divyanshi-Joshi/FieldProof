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
}
