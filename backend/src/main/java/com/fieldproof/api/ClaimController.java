package com.fieldproof.api;

import com.fieldproof.api.dto.ClaimBundle;
import com.fieldproof.service.ClaimService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {
    private final ClaimService claimService;

    public ClaimController(ClaimService claimService) {
        this.claimService = claimService;
    }

    @GetMapping
    public ResponseEntity<List<ClaimBundle>> getAllClaims(
            @RequestParam(value = "outcome", required = false) String outcomeFilter) {
        List<ClaimBundle> claims = new ArrayList<>(claimService.getAllClaims());
        // Sort by priority (Day 3 §T3.8):
        // 1. Phenological & Spatial Basis Risk Gaps
        // 2. Evidence Conflicts
        // 3. Integrity Holds & Possible Overpayments
        // 4. Other
        claims.sort((a, b) -> {
            int pA = getPriority(a);
            int pB = getPriority(b);
            return Integer.compare(pA, pB);
        });
        if (outcomeFilter != null && !outcomeFilter.isBlank()) {
            claims = claims.stream()
                    .filter(c -> c.decision() != null &&
                            c.decision().outcomeClass().name().equalsIgnoreCase(outcomeFilter.trim()))
                    .toList();
        }
        return ResponseEntity.ok(claims);
    }

    private int getPriority(ClaimBundle b) {
        if (b.decision() == null || b.decision().outcomeClass() == null)
            return 5;
        return switch (b.decision().outcomeClass()) {
            case PHENOLOGICAL_BASIS_RISK_GAP, SPATIAL_BASIS_RISK_GAP -> 1;
            case EVIDENCE_CONFLICT -> 2;
            case INTEGRITY_HOLD, POSSIBLE_OVERPAYMENT -> 3;
            default -> 4;
        };
    }

    @GetMapping("/{claimId}")
    public ResponseEntity<ClaimBundle> getClaim(@PathVariable("claimId") String claimId) {
        return claimService.getClaim(claimId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{claimId}/status")
    public ResponseEntity<Map<String, Object>> getClaimStatus(@PathVariable("claimId") String claimId) {
        return claimService.getClaim(claimId)
                .map(bundle -> {
                    Map<String, Object> status = new LinkedHashMap<>();
                    status.put("claimId", claimId);
                    status.put("status", bundle.decision() != null ? "AWAITING_ADJUSTER" : "PROCESSING");
                    status.put("step", "AWAITING_ADJUSTER");
                    status.put("integrityPassed", bundle.grading() != null && bundle.grading().integrityPassed());
                    status.put("flags", bundle.grading() != null ? bundle.grading().integrityFlags() : List.of());
                    status.put("farmerMessages", bundle.decision() != null ? bundle.decision().farmerMessages() : null);
                    return ResponseEntity.ok(status);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{claimId}/brief")
    public ResponseEntity<Map<String, Object>> getClaimBrief(
            @PathVariable("claimId") String claimId,
            @RequestParam(value = "lang", required = false, defaultValue = "en") String lang) {
        return claimService.getClaim(claimId)
                .map(bundle -> {
                    Map<String, Object> resp = new LinkedHashMap<>();
                    resp.put("claimId", claimId);
                    resp.put("lang", lang);
                    resp.put("brief", bundle.decision() != null ? bundle.decision().adjusterBrief() : "");
                    resp.put("clauseCitations",
                            bundle.decision() != null ? bundle.decision().citedClauseIds() : List.of());
                    resp.put("citationsValidated",
                            bundle.decision() != null && bundle.decision().citationsValidatedByCode());
                    return ResponseEntity.ok(resp);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{claimId}/decision")
    public ResponseEntity<ClaimBundle> recordAdjusterDecision(
            @PathVariable("claimId") String claimId,
            @RequestBody ClaimBundle.AdjusterDecisionRequest request) {
        try {
            ClaimBundle updated = claimService.updateAdjusterDecision(claimId, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            // Day 3 §T3.7: 503 if audit write failed
            return ResponseEntity.status(503).build();
        }
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadClaim(
            @RequestParam(value = "plot_id", required = false) String plotId,
            @RequestParam(value = "crop", required = false, defaultValue = "maize") String crop,
            @RequestParam(value = "county", required = false, defaultValue = "Makueni") String county,
            @RequestPart(value = "photos", required = false) List<MultipartFile> photos) {
        String liveEnabled = System.getenv("FIELDPROOF_LIVE_UPLOADS_ENABLED");
        if ("false".equalsIgnoreCase(liveEnabled)) {
            return ResponseEntity.status(503).body(Map.of(
                    "demoOnly", true,
                    "message", "Live uploads temporarily disabled. Please explore the seeded demo cases."));
        }
        ClaimBundle.ClaimUploadResponse response = claimService.uploadFarmerClaim(plotId, crop, county, photos);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{claimId}/sync-earth-engine")
    public ResponseEntity<ClaimBundle> syncEarthEngine(
            @PathVariable("claimId") String claimId,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lon", required = false) Double lon) {
        try {
            ClaimBundle updated = claimService.syncClaimWithEarthEngine(claimId, lat, lon);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> resetDemoCases() {
        claimService.loadDemoCases();
        return ResponseEntity.ok().build();
    }
}