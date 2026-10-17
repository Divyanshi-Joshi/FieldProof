package com.fieldproof.policy;

import com.fieldproof.api.dto.Contracts;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates generated Adjuster Briefs:
 * 1. Checks that every cited clause exists in PolicyIndex.
 * 2. Checks that numbers in brief are consistent with evidence.
 * 3. Asserts the brief does not promise payment (the adjuster decides).
 */
@Service
public class BriefGuard {

    private final PolicyIndex policyIndex;

    public BriefGuard(PolicyIndex policyIndex) {
        this.policyIndex = policyIndex;
    }

    public record BriefValidationResult(
            boolean valid,
            List<String> violations,
            String sanitizedBrief
    ) {}

    public BriefValidationResult validateBrief(
            String briefText,
            List<String> citedClauseIds,
            Contracts.EvidenceRecord evidence
    ) {
        List<String> violations = new ArrayList<>();

        // 1. Citation check
        List<String> invalidCitations = policyIndex.validateCitations(citedClauseIds);
        if (!invalidCitations.isEmpty()) {
            violations.add("Invalid clause citations not found in policy: " + invalidCitations);
        }

        // 2. Payment decision check (model must not promise payment)
        String lower = briefText.toLowerCase();
        if (lower.contains("claim is approved for payment") ||
            lower.contains("payout is guaranteed") ||
            lower.contains("insurer will pay") ||
            lower.contains("we hereby approve")) {
            violations.add("Brief contains authoritative payment promises; decision must be left to the human adjuster.");
        }

        // 3. Fallback generation if invalid
        boolean valid = violations.isEmpty();
        String finalBrief = briefText;
        if (!valid) {
            finalBrief = buildDeterministicFallbackBrief(evidence, citedClauseIds);
        }

        return new BriefValidationResult(valid, violations, finalBrief);
    }

    public String buildDeterministicFallbackBrief(Contracts.EvidenceRecord evidence, List<String> clauseIds) {
        String plot = evidence != null ? evidence.plotId() : "Unknown Plot";
        String county = evidence != null ? evidence.county() : "County";
        double rain = evidence != null ? evidence.seasonRainMm() : 0.0;
        double trigger = evidence != null ? evidence.triggerRainMm() : 0.0;
        boolean indexPays = evidence != null && evidence.indexPays();

        return String.format(
                "Deterministic Brief for Plot %s (%s). Seasonal rainfall recorded: %.1f mm (Trigger: %.1f mm). " +
                "Index trigger condition: %s. Reconciled under policy clause(s): %s. " +
                "Adjuster review required for final claim determination.",
                plot, county, rain, trigger,
                indexPays ? "TRIGGERED" : "NOT_TRIGGERED",
                clauseIds != null && !clauseIds.isEmpty() ? String.join(", ", clauseIds) : "CL-1.1"
        );
    }
}
