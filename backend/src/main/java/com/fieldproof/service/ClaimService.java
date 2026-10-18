package com.fieldproof.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fieldproof.api.dto.ClaimBundle;
import com.fieldproof.api.dto.Contracts;
import com.fieldproof.core.ConcordanceTable;
import com.fieldproof.core.SeverityBand;
import com.fieldproof.tools.ImageIntegrityTools;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import com.fieldproof.ai.GradingService;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ClaimService {

    private static final Logger log = LoggerFactory.getLogger(ClaimService.class);

    private final ObjectMapper objectMapper;
    private final GradingService gradingService;
    private final com.fieldproof.store.ClaimStore claimStore;
    private final com.fieldproof.policy.BriefGuard briefGuard;
    private final FarmerMessageService farmerMessageService;
    private final com.fieldproof.tools.bq.BigQueryAuditWriter auditWriter;
    private final com.fieldproof.tools.gee.EarthEngineService earthEngineService;

    public ClaimService() {
        this(new ObjectMapper().registerModule(new JavaTimeModule()), null, null, null, null, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ClaimService(
            ObjectMapper objectMapper,
            @org.springframework.beans.factory.annotation.Autowired(required = false) GradingService gradingService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.fieldproof.store.ClaimStore claimStore,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.fieldproof.policy.BriefGuard briefGuard,
            @org.springframework.beans.factory.annotation.Autowired(required = false) FarmerMessageService farmerMessageService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.fieldproof.tools.bq.BigQueryAuditWriter auditWriter,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.fieldproof.tools.gee.EarthEngineService earthEngineService
    ) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper().registerModule(new JavaTimeModule());
        this.gradingService = gradingService;
        this.claimStore = claimStore != null ? claimStore : new com.fieldproof.store.LocalClaimStore(this.objectMapper);
        this.briefGuard = briefGuard != null ? briefGuard : new com.fieldproof.policy.BriefGuard(new com.fieldproof.policy.PolicyIndex(this.objectMapper));
        this.farmerMessageService = farmerMessageService != null ? farmerMessageService : new FarmerMessageService();
        this.auditWriter = auditWriter != null ? auditWriter : new com.fieldproof.tools.bq.BigQueryAuditWriter();
        this.earthEngineService = earthEngineService != null ? earthEngineService : new com.fieldproof.tools.gee.EarthEngineService();
    }

    @PostConstruct
    public void init() {
        loadDemoCases();
    }

    public synchronized void loadDemoCases() {
        try {
            File file = new File("contracts/demo_cases.mock.json");
            if (!file.exists()) {
                file = new File("../contracts/demo_cases.mock.json");
            }

            List<ClaimBundle> cases;
            if (file.exists()) {
                cases = objectMapper.readValue(file, new TypeReference<List<ClaimBundle>>() {});
            } else {
                InputStream is = getClass().getResourceAsStream("/contracts/demo_cases.mock.json");
                if (is != null) {
                    cases = objectMapper.readValue(is, new TypeReference<List<ClaimBundle>>() {});
                } else {
                    log.warn("demo_cases.mock.json not found, using empty demo set");
                    cases = Collections.emptyList();
                }
            }

            claimStore.clear();

            for (ClaimBundle bundle : cases) {
                if (bundle.grading() != null && bundle.grading().claimId() != null) {
                    claimStore.create(bundle);
                }
            }
            log.info("Loaded {} demo claim bundles successfully", claimStore.listAll().size());
        } catch (Exception e) {
            log.error("Failed to load demo_cases.mock.json", e);
        }
    }

    public List<ClaimBundle> getAllClaims() {
        return claimStore.listAll();
    }

    public Optional<ClaimBundle> getClaim(String claimId) {
        return claimStore.get(claimId);
    }

    public String getFrozenCommitHash() {
        try {
            File hashFile = new File("protocol/COMMIT_HASH.txt");
            if (!hashFile.exists()) hashFile = new File("../protocol/COMMIT_HASH.txt");
            if (hashFile.exists()) {
                List<String> lines = Files.readAllLines(hashFile.toPath());
                if (!lines.isEmpty() && !lines.get(0).isBlank()) {
                    return lines.get(0).trim();
                }
            }
        } catch (Exception ignored) {}
        return "0371cad";
    }

    public synchronized ClaimBundle updateAdjusterDecision(String claimId, ClaimBundle.AdjusterDecisionRequest req) {
        ClaimBundle existing = claimStore.get(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found: " + claimId));

        Contracts.AuditRecord oldAudit = existing.audit();
        Contracts.AuditRecord newAudit = new Contracts.AuditRecord(
                oldAudit != null ? oldAudit.auditId() : "AUD-" + UUID.randomUUID().toString().substring(0, 8),
                claimId,
                existing.grading().plotId(),
                Instant.now(),
                oldAudit != null ? oldAudit.modelVersion() : "gemini-2.0-flash-001",
                oldAudit != null ? oldAudit.promptVersion() : "v2.1.0",
                oldAudit != null ? oldAudit.anchorImageIds() : List.of("anchor-healthy-001", "anchor-moderate-002", "anchor-severe-003"),
                oldAudit != null ? oldAudit.frozenProtocolCommitHash() : getFrozenCommitHash(),
                existing.evidence() != null ? existing.evidence().evidenceTimestampUtc() : Instant.now(),
                false,
                existing.decision() != null ? existing.decision().outcomeClass() : Contracts.OutcomeClass.CONSISTENT,
                existing.decision() != null ? existing.decision().recommendedAction() : Contracts.RecommendedAction.NO_ACTION,
                req.adjusterId() != null ? req.adjusterId() : "ADJ-HUMAN-01",
                req.action(),
                req.notes() != null ? req.notes() : "",
                Instant.now()
        );

        ClaimBundle updated = new ClaimBundle(
                existing.caseNumber(),
                existing.label(),
                existing.description(),
                existing.grading(),
                existing.evidence(),
                existing.decision(),
                newAudit
        );

        // Day 3 §T3.7: Adjuster action requires successful audit write, otherwise fail (HTTP 503)
        boolean auditSuccess = auditWriter.writeAuditRecord(newAudit);
        if (!auditSuccess) {
            throw new IllegalStateException("Audit write failed for adjuster action on claim " + claimId + ". Decision not accepted.");
        }

        claimStore.update(updated);
        log.info("Updated claim {} with adjuster decision {}", claimId, req.action());
        return updated;
    }

    public synchronized ClaimBundle.ClaimUploadResponse uploadFarmerClaim(
            String plotId,
            String crop,
            String county,
            List<MultipartFile> files
    ) {
        String claimId = "CLM-2026-" + String.format("%03d", claimStore.listAll().size() + 1);
        String safePlotId = (plotId != null && !plotId.isBlank()) ? plotId : "P-" + UUID.randomUUID().toString().substring(0, 4);

        List<Path> tempPaths = new ArrayList<>();
        List<String> integrityFlags = new ArrayList<>();
        List<Integer> rejectedIndices = new ArrayList<>();
        List<String> photoUrls = new ArrayList<>();
        List<GradingService.PhotoInput> photoInputs = new ArrayList<>();
        boolean integrityPassed = true;
        ImageIntegrityTools.BundleIntegrityResult report = null;

        try {
            if (files != null && !files.isEmpty()) {
                Path tempDir = Files.createTempDirectory("fp_upload_");
                for (int i = 0; i < files.size(); i++) {
                    MultipartFile file = files.get(i);
                    String origName = file.getOriginalFilename();
                    if (origName == null || origName.isBlank()) {
                        origName = "photo_" + (i + 1) + ".jpg";
                    }
                    Path dest = tempDir.resolve("photo_" + i + "_" + origName);
                    file.transferTo(dest);
                    tempPaths.add(dest);

                    byte[] bytes = Files.readAllBytes(dest);
                    String mimeType = file.getContentType() != null && !file.getContentType().isBlank()
                            ? file.getContentType() : "image/jpeg";
                    photoInputs.add(new GradingService.PhotoInput(origName, bytes, mimeType));

                    // Check if file corresponds to an authentic dataset image or custom upload
                    if (origName.startsWith("L") || origName.contains("_repeat_") || origName.contains("_initial_")) {
                        photoUrls.add("/images/" + origName);
                    } else if (bytes.length > 0) {
                        photoUrls.add("data:" + mimeType + ";base64," + Base64.getEncoder().encodeToString(bytes));
                    } else {
                        photoUrls.add("/images/" + origName);
                    }
                }

                report = ImageIntegrityTools.evaluateBundleIntegrity(claimId, tempPaths);
                integrityPassed = report.integrityPassed();
                integrityFlags.addAll(report.integrityFlags());
                if (report.rejectedPhotoIndices() != null) {
                    rejectedIndices.addAll(report.rejectedPhotoIndices());
                }
            } else {
                integrityFlags.add("demo_mode_no_raw_files");
            }
        } catch (Exception e) {
            log.error("Integrity check failed during upload", e);
            integrityPassed = false;
            integrityFlags.add("integrity_check_error: " + e.getMessage());
        }

        if (photoUrls.isEmpty()) {
            photoUrls = List.of("/images/L429F00196C01S01028Rp12846.jpg", "/images/L429F00196C01S01028Rp13485.jpg", "/images/L429F00196C01S01028Rp14607.jpg");
        }

        Contracts.Signs signs = null;
        Contracts.SeverityBand band = null;
        Contracts.DamageType damageType = Contracts.DamageType.drought;
        Contracts.GrowthStage growthStage = Contracts.GrowthStage.flowering;
        List<String> visibleEvidence = new ArrayList<>();
        double confidence = 0.88;

        // Use Gemini AI perception if integrity passed and gradingService is available
        if (integrityPassed && gradingService != null && !photoInputs.isEmpty()) {
            try {
                log.info("Dispatching Gemini vision grading for claim {} ({} photos)", claimId, photoInputs.size());
                GradingService.GradingExecution exec = gradingService.grade(photoInputs, true, 1);
                if (exec != null && exec.gradingResult() != null) {
                    com.fieldproof.core.GradingResult r = exec.gradingResult();
                    if (r.signs() != null) {
                        signs = new Contracts.Signs(
                                r.signs().leafRolling0to3(),
                                r.signs().canopySenescence0to3(),
                                r.signs().stunting0to3(),
                                r.signs().soilCrackingVisible()
                        );
                    }
                    if (r.damageType() != null) {
                        try {
                            damageType = Contracts.DamageType.valueOf(r.damageType().toLowerCase());
                        } catch (Exception ignored) {
                            damageType = Contracts.DamageType.drought;
                        }
                    }
                    if (r.growthStage() != null) {
                        try {
                            growthStage = Contracts.GrowthStage.valueOf(r.growthStage().toLowerCase());
                        } catch (Exception ignored) {
                            growthStage = Contracts.GrowthStage.flowering;
                        }
                    }
                    if (r.visibleEvidence() != null && !r.visibleEvidence().isEmpty()) {
                        visibleEvidence.addAll(r.visibleEvidence());
                    }
                    if (!r.sameFieldAcrossPhotos()) {
                        log.warn("Gemini detected photos from different fields for claim {}", claimId);
                        integrityPassed = false;
                        if (!integrityFlags.contains("photos_from_different_fields")) {
                            integrityFlags.add("photos_from_different_fields");
                        }
                    }
                    if (r.screenRecaptureSuspected()) {
                        log.warn("Gemini detected screen recapture for claim {}", claimId);
                        integrityPassed = false;
                        if (!integrityFlags.contains("screen_recapture_suspected")) {
                            integrityFlags.add("screen_recapture_suspected");
                        }
                    }
                    if (r.photoQualityFlags() != null) {
                        for (String flag : r.photoQualityFlags()) {
                            if (flag.contains("duplicate") && !integrityFlags.contains("duplicate_photo_detected")) {
                                integrityFlags.add("duplicate_photo_detected");
                                integrityPassed = false;
                            }
                            if (flag.contains("different_field") && !integrityFlags.contains("photos_from_different_fields")) {
                                integrityFlags.add("photos_from_different_fields");
                                integrityPassed = false;
                            }
                        }
                    }
                    confidence = r.confidence() > 0 ? r.confidence() : 0.85;
                    band = exec.severityBand();
                    log.info("Gemini vision analysis completed for claim {}: signs={}, band={}, damageType={}", claimId, signs, band, damageType);
                }
            } catch (Exception e) {
                log.warn("Gemini call for claim {} failed or offline: {}. Falling back to deterministic baseline.", claimId, e.getMessage());
            }
        }

        if (signs == null) {
            signs = integrityPassed ? new Contracts.Signs(2, 2, 1, true) : new Contracts.Signs(0, 0, 0, false);
        }
        if (band == null) {
            band = SeverityBand.fromSigns(
                    signs.leafRolling(),
                    signs.canopySenescence(),
                    signs.stunting(),
                    signs.soilCrackingVisible()
            );
        }
        if (visibleEvidence.isEmpty()) {
            visibleEvidence = integrityPassed
                    ? List.of("leaf rolling", "senescence", "visible soil cracks")
                    : List.of("integrity hold - photos not graded");
        }

        Contracts.EvidenceRecord evidence = earthEngineService.createEvidenceRecord(
                safePlotId,
                null,
                null,
                county != null ? county : "Beed",
                "2025-Kharif",
                crop != null ? crop : "maize"
        );

        ConcordanceTable.ConcordanceResult conc = ConcordanceTable.evaluate(
                integrityPassed,
                false,
                band,
                damageType,
                evidence.indexPays(),
                evidence.satelliteStress(),
                evidence.drySpellOverlapsCriticalStage(),
                evidence.lowLocalRain()
        );

        Contracts.OutcomeClass outcomeClass = conc.outcomeClass();
        Contracts.RecommendedAction action = conc.recommendedAction();
        String failureMode = conc.failureMode();
        List<String> clauseIds = conc.citedClauseIds();

        Contracts.GradingPass pass = new Contracts.GradingPass(
                true, true, false, crop != null ? crop : "maize",
                growthStage,
                signs, damageType, confidence,
                visibleEvidence,
                Collections.emptyList()
        );

        Contracts.GradingResult grading = new Contracts.GradingResult(
                claimId, safePlotId, Instant.now(),
                photoUrls,
                integrityPassed,
                report != null && report.duplicateWithinClaim(),
                report != null && report.duplicateAcrossClaims(),
                report != null ? report.matchedEarlierClaimId() : null,
                rejectedIndices,
                report != null && report.exifTimestampPresent(),
                report != null && report.exifGpsPresent(),
                integrityFlags,
                pass, pass,
                true, true, false, crop != null ? crop : "maize",
                growthStage,
                signs, damageType, confidence,
                visibleEvidence,
                Collections.emptyList(),
                band, band, true, band, false
        );

        String rawBrief = "Newly submitted claim " + claimId + " for plot " + safePlotId + " (" + (county != null ? county : "Beed") + "). "
                + (integrityPassed ? "Photos passed authenticity checks. " : "Photos raised authenticity flags. ")
                + "Model perceived " + damageType + " damage at stage " + growthStage + " (" + band + "). "
                + "Concordance table outcome: " + outcomeClass + " (" + action + "). Cited clause(s): " + String.join(", ", clauseIds) + ".";

        com.fieldproof.policy.BriefGuard.BriefValidationResult briefValidation =
                briefGuard.validateBrief(rawBrief, clauseIds, evidence);

        String enMsg = farmerMessageService.getMessage(outcomeClass, integrityFlags, "en");
        String hiMsg = farmerMessageService.getMessage(outcomeClass, integrityFlags, "hi");
        String swMsg = farmerMessageService.getMessage(outcomeClass, integrityFlags, "sw");

        Contracts.ClaimDecision decision = new Contracts.ClaimDecision(
                claimId, safePlotId, outcomeClass, action, failureMode, clauseIds, briefValidation.valid(),
                briefValidation.sanitizedBrief(),
                new Contracts.FarmerMessages(enMsg, hiMsg, swMsg)
        );

        Contracts.AuditRecord audit = new Contracts.AuditRecord(
                "AUD-" + UUID.randomUUID().toString().substring(0, 8),
                claimId, safePlotId, Instant.now(),
                "gemini-3-flash-preview", "grading_signs_v1",
                List.of("anchor-healthy-001", "anchor-moderate-002", "anchor-severe-003"),
                getFrozenCommitHash(), Instant.now(), false,
                outcomeClass, action,
                null, Contracts.AdjusterAction.PENDING, null, null
        );

        ClaimBundle bundle = new ClaimBundle(
                claimStore.listAll().size() + 1,
                outcomeClass.name() + " — Newly Uploaded Claim (" + claimId + ")",
                failureMode,
                grading, evidence, decision, audit
        );

        claimStore.create(bundle);

        return new ClaimBundle.ClaimUploadResponse(
                claimId, safePlotId, integrityPassed, integrityFlags,
                outcomeClass, action,
                decision.farmerMessages().en(),
                bundle
        );
    }

    public synchronized ClaimBundle syncClaimWithEarthEngine(String claimId, Double customLat, Double customLon) {
        ClaimBundle existing = claimStore.get(claimId)
                .orElseThrow(() -> new IllegalArgumentException("Claim not found: " + claimId));

        String plotId = existing.grading().plotId();
        String crop = existing.grading().crop();
        String county = existing.evidence() != null ? existing.evidence().county() : "Beed";
        String season = existing.evidence() != null ? existing.evidence().season() : "2025-Kharif";

        Contracts.EvidenceRecord newEvidence = earthEngineService.createEvidenceRecord(
                plotId,
                customLat,
                customLon,
                county,
                season,
                crop
        );

        Contracts.SeverityBand band = existing.grading().finalSeverityBand();
        Contracts.DamageType damageType = existing.grading().damageType();
        boolean integrityPassed = existing.grading().integrityPassed();

        ConcordanceTable.ConcordanceResult conc = ConcordanceTable.evaluate(
                integrityPassed,
                false,
                band,
                damageType,
                newEvidence.indexPays(),
                newEvidence.satelliteStress(),
                newEvidence.drySpellOverlapsCriticalStage(),
                newEvidence.lowLocalRain()
        );

        String failureMode = conc.failureMode();
        List<String> clauseIds = conc.citedClauseIds();
        String adjusterBrief = "Dynamically reconciled via Google Earth Engine Sentinel-2 & CHIRPS orbit evidence. " + failureMode;

        List<String> integrityFlags = existing.grading() != null ? existing.grading().integrityFlags() : List.of();
        String enMsg = farmerMessageService.getMessage(conc.outcomeClass(), integrityFlags, "en");
        String hiMsg = farmerMessageService.getMessage(conc.outcomeClass(), integrityFlags, "hi");
        String swMsg = farmerMessageService.getMessage(conc.outcomeClass(), integrityFlags, "sw");
        Contracts.FarmerMessages farmerMessages = new Contracts.FarmerMessages(enMsg, hiMsg, swMsg);

        Contracts.ClaimDecision newDecision = new Contracts.ClaimDecision(
                claimId,
                plotId,
                conc.outcomeClass(),
                conc.recommendedAction(),
                failureMode,
                clauseIds,
                true,
                adjusterBrief,
                farmerMessages
        );

        ClaimBundle updated = new ClaimBundle(
                existing.caseNumber(),
                existing.label() + " (GEE Synced)",
                existing.description(),
                existing.grading(),
                newEvidence,
                newDecision,
                existing.audit()
        );

        claimStore.update(updated);
        log.info("Claim {} synchronized with Google Earth Engine orbit data. New outcome: {}", claimId, conc.outcomeClass());
        return updated;
    }

    public com.fieldproof.tools.gee.EarthEngineService getEarthEngineService() {
        return earthEngineService;
    }
}
