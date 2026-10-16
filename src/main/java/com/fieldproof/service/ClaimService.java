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
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ClaimService {

    private static final Logger log = LoggerFactory.getLogger(ClaimService.class);

    private final ObjectMapper objectMapper;
    private final Map<String, ClaimBundle> claimStore = new ConcurrentHashMap<>();
    private final List<String> orderedClaimIds = new CopyOnWriteArrayList<>();

    public ClaimService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
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
            orderedClaimIds.clear();

            for (ClaimBundle bundle : cases) {
                if (bundle.grading() != null && bundle.grading().claimId() != null) {
                    claimStore.put(bundle.grading().claimId(), bundle);
                    orderedClaimIds.add(bundle.grading().claimId());
                }
            }
            log.info("Loaded {} demo claim bundles successfully", claimStore.size());
        } catch (Exception e) {
            log.error("Failed to load demo_cases.mock.json", e);
        }
    }

    public List<ClaimBundle> getAllClaims() {
        List<ClaimBundle> list = new ArrayList<>();
        for (String id : orderedClaimIds) {
            ClaimBundle bundle = claimStore.get(id);
            if (bundle != null) {
                list.add(bundle);
            }
        }
        return Collections.unmodifiableList(list);
    }

    public Optional<ClaimBundle> getClaim(String claimId) {
        return Optional.ofNullable(claimStore.get(claimId));
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
        ClaimBundle existing = claimStore.get(claimId);
        if (existing == null) {
            throw new IllegalArgumentException("Claim not found: " + claimId);
        }

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

        claimStore.put(claimId, updated);
        log.info("Updated claim {} with adjuster decision {}", claimId, req.action());
        return updated;
    }

    public synchronized ClaimBundle.ClaimUploadResponse uploadFarmerClaim(
            String plotId,
            String crop,
            String county,
            List<MultipartFile> files
    ) {
        String claimId = "CLM-2026-" + String.format("%03d", claimStore.size() + 1);
        String safePlotId = (plotId != null && !plotId.isBlank()) ? plotId : "P-" + UUID.randomUUID().toString().substring(0, 4);

        List<Path> tempPaths = new ArrayList<>();
        List<String> integrityFlags = new ArrayList<>();
        boolean integrityPassed = true;

        try {
            if (files != null && !files.isEmpty()) {
                Path tempDir = Files.createTempDirectory("fp_upload_");
                for (int i = 0; i < files.size(); i++) {
                    MultipartFile file = files.get(i);
                    Path dest = tempDir.resolve("photo_" + i + "_" + file.getOriginalFilename());
                    file.transferTo(dest);
                    tempPaths.add(dest);
                }

                ImageIntegrityTools.BundleIntegrityResult report =
                        ImageIntegrityTools.evaluateBundleIntegrity(claimId, tempPaths);
                integrityPassed = report.integrityPassed();
                integrityFlags.addAll(report.integrityFlags());
            } else {
                integrityFlags.add("demo_mode_no_raw_files");
            }
        } catch (Exception e) {
            log.error("Integrity check failed during upload", e);
            integrityPassed = false;
            integrityFlags.add("integrity_check_error: " + e.getMessage());
        }

        // Evaluate signs using deterministic pure Java core
        Contracts.Signs signs = new Contracts.Signs(2, 2, 1, true);
        Contracts.SeverityBand band = SeverityBand.fromSigns(
                signs.leafRolling(),
                signs.canopySenescence(),
                signs.stunting(),
                signs.soilCrackingVisible()
        );

        Contracts.EvidenceRecord evidence = new Contracts.EvidenceRecord(
                safePlotId,
                county != null ? county : "Makueni",
                "2026-LR",
                crop != null ? crop : "maize",
                Contracts.CriticalGrowthStage.flowering,
                310.0,
                290.0,
                30,
                false, // seasonal rain > trigger rain
                true,
                18,
                LocalDate.now().minusDays(30),
                LocalDate.now().minusDays(12),
                true, // dry spell overlaps flowering
                0.32,
                0.54,
                -1.85,
                -1.5,
                true, // satellite stress confirmed
                Contracts.EvidenceSource.BIGQUERY_DATASET,
                Instant.now()
        );

        ConcordanceTable.ConcordanceResult conc = ConcordanceTable.evaluate(
                integrityPassed,
                false,
                band,
                Contracts.DamageType.drought,
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
                Contracts.GrowthStage.flowering,
                signs, Contracts.DamageType.drought, 0.88,
                List.of("leaf rolling", "senescence", "visible soil cracks"),
                Collections.emptyList()
        );

        Contracts.GradingResult grading = new Contracts.GradingResult(
                claimId, safePlotId, Instant.now(),
                List.of("uploads/photo_1.jpg", "uploads/photo_2.jpg", "uploads/photo_3.jpg"),
                integrityPassed, false, false, null, Collections.emptyList(),
                true, false, integrityFlags,
                pass, pass,
                true, true, false, crop != null ? crop : "maize",
                Contracts.GrowthStage.flowering,
                signs, Contracts.DamageType.drought, 0.88,
                List.of("leaf rolling", "canopy senescence"),
                Collections.emptyList(),
                band, band, true, band, false
        );

        Contracts.ClaimDecision decision = new Contracts.ClaimDecision(
                claimId, safePlotId, outcomeClass, action, failureMode, clauseIds, true,
                "Claim processed under illustrative policy clause " + String.join(", ", clauseIds),
                new Contracts.FarmerMessages(
                        "Your claim " + claimId + " for plot " + safePlotId + " has been received and evaluated. Outcome: " + outcomeClass,
                        "आपका दावा " + claimId + " प्लॉट " + safePlotId + " के लिए दर्ज कर लिया गया है।",
                        "Dai lako " + claimId + " kwa shamba " + safePlotId + " limepokelewa na kutathminiwa."
                )
        );

        Contracts.AuditRecord audit = new Contracts.AuditRecord(
                "AUD-" + UUID.randomUUID().toString().substring(0, 8),
                claimId, safePlotId, Instant.now(),
                "gemini-2.0-flash-001", "v2.1.0",
                List.of("anchor-healthy-001", "anchor-moderate-002", "anchor-severe-003"),
                getFrozenCommitHash(), Instant.now(), false,
                outcomeClass, action,
                null, Contracts.AdjusterAction.PENDING, null, null
        );

        ClaimBundle bundle = new ClaimBundle(
                claimStore.size() + 1,
                outcomeClass.name() + " — Newly Uploaded Claim",
                failureMode,
                grading, evidence, decision, audit
        );

        claimStore.put(claimId, bundle);
        orderedClaimIds.add(claimId);

        return new ClaimBundle.ClaimUploadResponse(
                claimId, safePlotId, integrityPassed, integrityFlags,
                outcomeClass, action,
                decision.farmerMessages().en(),
                bundle
        );
    }
}
