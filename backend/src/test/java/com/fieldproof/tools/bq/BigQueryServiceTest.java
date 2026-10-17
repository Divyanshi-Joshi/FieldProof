package com.fieldproof.tools.bq;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class BigQueryServiceTest {

    @Test
    void testAllowlistedQueryIsAccepted() {
        BigQueryService bq = new BigQueryService();
        assertTrue(bq.isQueryAllowed("frozen_trigger"));

        BigQueryService.QueryPlan plan = bq.prepareNamedQuery("frozen_trigger", Map.of("plot_id", "P-0142"));
        assertNotNull(plan);
        assertEquals("frozen_trigger", plan.queryName());
        assertEquals("P-0142", plan.boundParameters().get("plot_id"));
    }

    @Test
    void testNonAllowlistedQueryIsRejected() {
        BigQueryService bq = new BigQueryService();
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                bq.prepareNamedQuery("drop_database", Map.of())
        );
        assertTrue(ex.getMessage().contains("not in the allowlist"));
    }
}
