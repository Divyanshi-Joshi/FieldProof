package com.fieldproof.api;

import com.fieldproof.api.dto.Contracts;
import com.fieldproof.eval.ResponsibleAiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST API for Pillar 4: Google Responsible AI Framework & Compliance Console.
 */
@RestController
@RequestMapping("/api/responsible-ai")
public class ResponsibleAiController {

    private final ResponsibleAiService responsibleAiService;

    public ResponsibleAiController(ResponsibleAiService responsibleAiService) {
        this.responsibleAiService = responsibleAiService;
    }

    @GetMapping("/audit")
    public ResponseEntity<Contracts.ResponsibleAiAudit> getComplianceAudit() {
        Contracts.ResponsibleAiAudit audit = responsibleAiService.getComplianceAudit();
        return ResponseEntity.ok(audit);
    }

    @GetMapping("/two-pass/{claimId}")
    public ResponseEntity<Contracts.TwoPassComparison> getTwoPassComparison(
            @PathVariable("claimId") String claimId
    ) {
        Contracts.TwoPassComparison comparison = responsibleAiService.evaluateTwoPassGate(claimId);
        return ResponseEntity.ok(comparison);
    }
}
