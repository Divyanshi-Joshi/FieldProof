package com.fieldproof.core;

import com.fieldproof.api.dto.Contracts.SeverityBand;
import com.fieldproof.core.CoreContracts.HashReport;

/**
 * Forensics validator enforcing that code overrides any model assertion if integrity fails (docs/DAY2 §T2.4).
 */
public final class ForensicsValidator {
    private ForensicsValidator() {}

    public record ForensicsDecision(
            boolean integrityOk,
            SeverityBand effectiveBand,
            String reason
    ) {}

    public static ForensicsDecision validate(
            HashReport hashReport,
            boolean isCropField,
            boolean sameFieldAcrossPhotos,
            boolean screenRecaptureSuspected,
            SeverityBand agreedBand
    ) {
        if (!isCropField) {
            return new ForensicsDecision(false, SeverityBand.ABSTAIN, "Photo does not depict an agricultural crop field.");
        }
        if (screenRecaptureSuspected) {
            return new ForensicsDecision(false, SeverityBand.ABSTAIN, "Suspected photographed computer/phone screen or moire pattern.");
        }
        if (!sameFieldAcrossPhotos) {
            return new ForensicsDecision(false, SeverityBand.ABSTAIN, "Photos appear to originate from different agricultural plots.");
        }
        if (hashReport != null && !hashReport.integrityPassed()) {
            return new ForensicsDecision(false, SeverityBand.ABSTAIN, "Duplicate or near-duplicate photo detected in claim bundle.");
        }

        return new ForensicsDecision(true, agreedBand, "All forensic integrity gates cleared.");
    }
}
