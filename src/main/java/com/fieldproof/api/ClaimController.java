package com.fieldproof.api;

import com.fieldproof.api.dto.ClaimBundle;
import com.fieldproof.service.ClaimService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private final ClaimService claimService;

    public ClaimController(ClaimService claimService) {
        this.claimService = claimService;
    }

    @GetMapping
    public ResponseEntity<List<ClaimBundle>> getAllClaims() {
        return ResponseEntity.ok(claimService.getAllClaims());
    }

    @GetMapping("/{claimId}")
    public ResponseEntity<ClaimBundle> getClaim(@PathVariable String claimId) {
        return claimService.getClaim(claimId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{claimId}/decision")
    public ResponseEntity<ClaimBundle> recordAdjusterDecision(
            @PathVariable String claimId,
            @RequestBody ClaimBundle.AdjusterDecisionRequest request
    ) {
        try {
            ClaimBundle updated = claimService.updateAdjusterDecision(claimId, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ClaimBundle.ClaimUploadResponse> uploadClaim(
            @RequestParam(value = "plot_id", required = false) String plotId,
            @RequestParam(value = "crop", required = false, defaultValue = "maize") String crop,
            @RequestParam(value = "county", required = false, defaultValue = "Makueni") String county,
            @RequestPart(value = "photos", required = false) List<MultipartFile> photos
    ) {
        ClaimBundle.ClaimUploadResponse response =
                claimService.uploadFarmerClaim(plotId, crop, county, photos);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> resetDemoCases() {
        claimService.loadDemoCases();
        return ResponseEntity.ok().build();
    }
}
