package com.fieldproof.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Composite DTO representing a full claim bundle with all 4 contract records
 * (GradingResult, EvidenceRecord, ClaimDecision, AuditRecord) plus demo metadata.
 */
public record ClaimBundle(
    @JsonProperty("_case") int caseNumber,
    @JsonProperty("_label") String label,
    @JsonProperty("_description") String description,
    @JsonProperty("grading") Contracts.GradingResult grading,
    @JsonProperty("evidence") Contracts.EvidenceRecord evidence,
    @JsonProperty("decision") Contracts.ClaimDecision decision,
    @JsonProperty("audit") Contracts.AuditRecord audit
) {
    /**
     * Request payload when a human claims adjuster submits their sign-off decision.
     */
    public record AdjusterDecisionRequest(
        @JsonProperty("adjuster_id") String adjusterId,
        @JsonProperty("action") Contracts.AdjusterAction action,
        @JsonProperty("notes") String notes
    ) {}

    /**
     * Farmer photo upload response.
     */
    public record ClaimUploadResponse(
        @JsonProperty("claim_id") String claimId,
        @JsonProperty("plot_id") String plotId,
        @JsonProperty("integrity_passed") boolean integrityPassed,
        @JsonProperty("integrity_flags") List<String> integrityFlags,
        @JsonProperty("outcome_class") Contracts.OutcomeClass outcomeClass,
        @JsonProperty("recommended_action") Contracts.RecommendedAction recommendedAction,
        @JsonProperty("message") String message,
        @JsonProperty("bundle") ClaimBundle bundle
    ) {}
}
