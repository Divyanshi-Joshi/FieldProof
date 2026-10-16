package com.fieldproof.core;

import com.fieldproof.api.dto.Contracts.SeverityBand;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link SeverityMapper} matching specifications in
 * {@code docs/DAY1_PERSON_A.md §T6}.
 */
class SeverityMapperTest {

    @Test
    @DisplayName("(3,2,1) gives SEVERE — two signs >= 2")
    void testSevere_3_2_1() {
        Signs signs = new Signs(3, 2, 1, false);
        assertEquals(SeverityBand.SEVERE, SeverityMapper.map(signs));
    }

    @Test
    @DisplayName("(2,2,0) gives SEVERE — exactly two signs >= 2")
    void testSevere_2_2_0() {
        Signs signs = new Signs(2, 2, 0, false);
        assertEquals(SeverityBand.SEVERE, SeverityMapper.map(signs));
    }

    @Test
    @DisplayName("(2,1,1) gives MODERATE — exactly one sign >= 2")
    void testModerate_2_1_1() {
        Signs signs = new Signs(2, 1, 1, false);
        assertEquals(SeverityBand.MODERATE, SeverityMapper.map(signs));
    }

    @Test
    @DisplayName("(3,0,0) gives MODERATE — exactly one sign >= 2")
    void testModerate_3_0_0() {
        Signs signs = new Signs(3, 0, 0, false);
        assertEquals(SeverityBand.MODERATE, SeverityMapper.map(signs));
    }

    @Test
    @DisplayName("(1,1,1) gives MILD — no sign >= 2, but at least one >= 1")
    void testMild_1_1_1() {
        Signs signs = new Signs(1, 1, 1, false);
        assertEquals(SeverityBand.MILD, SeverityMapper.map(signs));
    }

    @Test
    @DisplayName("(0,0,0) gives NONE — all three signs score 0")
    void testNone_0_0_0() {
        Signs signs = new Signs(0, 0, 0, false);
        assertEquals(SeverityBand.NONE, SeverityMapper.map(signs));
    }

    @Test
    @DisplayName("Soil cracking flag does not change severity band in T6 proposal")
    void testSoilCrackingFlagDoesNotAlterBand() {
        // (0,0,0) with cracking remains NONE in T6 proposal
        assertEquals(SeverityBand.NONE, SeverityMapper.map(new Signs(0, 0, 0, true)));
        // (1,0,0) with cracking remains MILD
        assertEquals(SeverityBand.MILD, SeverityMapper.map(new Signs(1, 0, 0, true)));
        // (2,0,0) with cracking remains MODERATE
        assertEquals(SeverityBand.MODERATE, SeverityMapper.map(new Signs(2, 0, 0, true)));
    }

    @ParameterizedTest(name = "Invalid score ({0}, {1}, {2}) throws IllegalArgumentException")
    @CsvSource({
            "-1, 0, 0",
            "0, -1, 0",
            "0, 0, -1",
            "4, 0, 0",
            "0, 4, 0",
            "0, 0, 4",
            "-5, 2, 1",
            "2, 5, 1"
    })
    void testInvalidScoresThrowException(int r, int s, int t) {
        assertThrows(IllegalArgumentException.class, () -> new Signs(r, s, t, false));
        assertThrows(IllegalArgumentException.class, () -> SeverityMapper.map(r, s, t, false));
    }
}
