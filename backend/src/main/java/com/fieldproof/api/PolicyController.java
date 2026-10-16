package com.fieldproof.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fieldproof.service.PolicyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/policy")
public class PolicyController {

    private final PolicyService policyService;

    public PolicyController(PolicyService policyService) {
        this.policyService = policyService;
    }

    @GetMapping("/clauses")
    public ResponseEntity<JsonNode> getClauses() {
        return ResponseEntity.ok(policyService.getClauseIndex());
    }

    @GetMapping("/text")
    public ResponseEntity<Map<String, Object>> getPolicyText() {
        return ResponseEntity.ok(policyService.getPolicyTextResponse());
    }
}
