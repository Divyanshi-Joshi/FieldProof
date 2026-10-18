package com.fieldproof.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fieldproof.service.PolicyService;
import com.fieldproof.api.dto.Contracts;
import com.fieldproof.policy.PolicyGroundingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/policy")
public class PolicyController {

    private final PolicyService policyService;
    private final PolicyGroundingService policyGroundingService;

    public PolicyController(PolicyService policyService, PolicyGroundingService policyGroundingService) {
        this.policyService = policyService;
        this.policyGroundingService = policyGroundingService;
    }

    @GetMapping("/clauses")
    public ResponseEntity<JsonNode> getClauses() {
        return ResponseEntity.ok(policyService.getClauseIndex());
    }

    @GetMapping("/text")
    public ResponseEntity<Map<String, Object>> getPolicyText() {
        return ResponseEntity.ok(policyService.getPolicyTextResponse());
    }

    @GetMapping("/ground/{claimId}")
    public ResponseEntity<Contracts.PolicyGroundingResult> groundClaim(
            @PathVariable("claimId") String claimId
    ) {
        Contracts.PolicyGroundingResult result = policyGroundingService.groundClaim(claimId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/query")
    public ResponseEntity<Contracts.PolicyQueryResponse> queryPolicyGrounding(
            @RequestBody Map<String, String> body
    ) {
        String query = body.getOrDefault("query", "");
        Contracts.PolicyQueryResponse response = policyGroundingService.answerPolicyGroundingQuery(query);
        return ResponseEntity.ok(response);
    }
}
