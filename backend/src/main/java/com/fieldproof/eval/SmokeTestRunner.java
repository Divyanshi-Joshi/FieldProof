package com.fieldproof.eval;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.ai.GradingService;
import com.fieldproof.ai.PromptLibrary;
import com.fieldproof.api.dto.Contracts.SeverityBand;
import com.fieldproof.config.FieldProofProperties;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

/**
 * Smoke test evaluation runner for Day 1 Gate 1 verification.
 * <p>
 * Triggered by: {@code ./mvnw spring-boot:run -Dspring-boot.run.profiles=smoke}
 * or {@code --spring.profiles.active=smoke}.
 * <p>
 * Evaluates the 4 arms on {@code data/dev30/labels.csv}:
 * <ol>
 *   <li>Raw prompt, 1 pass</li>
 *   <li>Signs rubric without anchors, 1 pass</li>
 *   <li>Signs rubric with anchors, pass 1</li>
 *   <li>Signs rubric with anchors, pass 2 (different anchor permutation)</li>
 * </ol>
 * Writes results to {@code out/smoke_results.jsonl} and {@code out/smoke_summary.md}.
 */
@Component
@Profile("smoke")
public class SmokeTestRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SmokeTestRunner.class);

    private final GradingService gradingService;
    private final PromptLibrary promptLibrary;
    private final FieldProofProperties props;
    private final ObjectMapper objectMapper;

    public SmokeTestRunner(GradingService gradingService,
                           PromptLibrary promptLibrary,
                           FieldProofProperties props,
                           ObjectMapper objectMapper) {
        this.gradingService = gradingService;
        this.promptLibrary = promptLibrary;
        this.props = props;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("══════════════════════════════════════════════════════════════");
        log.info(" FieldProof Day 1 Smoke Evaluation Runner (Profile: smoke)");
        log.info("══════════════════════════════════════════════════════════════");

        // 1. Check label-map.yml per T8 requirement
        if (!promptLibrary.isLabelMapConfigured()) {
            log.warn("NOTICE: config/label-map.yml contains placeholder damage types only ('none', 'other').");
            log.warn("Ensure Person B provides the confirmed damage types (D6) before the final evaluation run.");
        }

        // 2. Check data/dev30/labels.csv
        Path labelsPath = Path.of("data/dev30/labels.csv");
        if (!Files.exists(labelsPath) && Files.exists(Path.of("../data/dev30/labels.csv"))) {
            labelsPath = Path.of("../data/dev30/labels.csv");
        }

        if (!Files.exists(labelsPath)) {
            log.error("");
            log.error("╔══════════════════════════════════════════════════════════════╗");
            log.error("║  Smoke Test Stopped: data/dev30/labels.csv NOT FOUND         ║");
            log.error("╚══════════════════════════════════════════════════════════════╝");
            log.error("Person B needs to provide the 30 development images in data/dev30/ and");
            log.error("the labels file data/dev30/labels.csv (see docs/DAY1_PERSON_A.md §O9).");
            log.error("Expected CSV headers: image_id,file_name,damaged,damage_type,plot_id,season,county");
            return;
        }

        Path imagesDir = labelsPath.getParent();
        Path outDir = labelsPath.startsWith("..") ? Path.of("../out") : Path.of("out");
        Files.createDirectories(outDir);

        Path jsonlPath = outDir.resolve("smoke_results.jsonl");
        Path summaryPath = outDir.resolve("smoke_summary.md");

        List<EvaluationItem> items = loadEvaluationItems(labelsPath, imagesDir);
        if (items.isEmpty()) {
            log.error("No valid evaluation items found in {}", labelsPath);
            return;
        }

        log.info("Starting evaluation on {} development images...", items.size());

        List<EvaluationRecord> allRecords = new ArrayList<>();
        try (BufferedWriter jsonlWriter = Files.newBufferedWriter(jsonlPath, StandardCharsets.UTF_8)) {

            for (EvaluationItem item : items) {
                log.info("Evaluating image: {} (damaged={})", item.fileName, item.groundTruthDamaged);

                List<GradingService.PhotoInput> photoList = List.of(
                        new GradingService.PhotoInput(item.fileName, item.bytes, "image/jpeg")
                );

                // Arm 1: Raw prompt, 1 pass
                try {
                    var raw = gradingService.gradeRaw(photoList, 1);
                    boolean pred = raw.baselineResult().damaged();
                    var record = new EvaluationRecord(item.imageId, item.fileName, "arm1_raw_1pass", item.groundTruthDamaged,
                            pred, null, raw.baselineResult().damageType(), raw.baselineResult().confidence(),
                            List.of(), raw.rawResult().latencyMs(), raw.rawResult().inputTokens(), raw.rawResult().outputTokens(),
                            raw.rawResult().fromCache(), raw.rawResult().json());
                    allRecords.add(record);
                    jsonlWriter.write(objectMapper.writeValueAsString(record));
                    jsonlWriter.newLine();
                } catch (Exception e) {
                    log.error("Arm 1 failed for {}: {}", item.fileName, e.getMessage());
                }

                // Arm 2: Signs rubric without anchors, 1 pass
                try {
                    var signsNoAnchors = gradingService.grade(photoList, false, 1);
                    boolean predMild = signsNoAnchors.severityBand() != SeverityBand.NONE;
                    var record = new EvaluationRecord(item.imageId, item.fileName, "arm2_signs_no_anchors", item.groundTruthDamaged,
                            predMild, signsNoAnchors.severityBand(), signsNoAnchors.gradingResult().damageType(),
                            signsNoAnchors.gradingResult().confidence(), signsNoAnchors.gradingResult().visibleEvidence(),
                            signsNoAnchors.rawResult().latencyMs(), signsNoAnchors.rawResult().inputTokens(),
                            signsNoAnchors.rawResult().outputTokens(), signsNoAnchors.rawResult().fromCache(),
                            signsNoAnchors.rawResult().json());
                    allRecords.add(record);
                    jsonlWriter.write(objectMapper.writeValueAsString(record));
                    jsonlWriter.newLine();
                } catch (Exception e) {
                    log.error("Arm 2 failed for {}: {}", item.fileName, e.getMessage());
                }

                // Arm 3: Signs rubric with anchors, pass 1
                EvaluationRecord pass1Record = null;
                try {
                    var signsAnchorsPass1 = gradingService.grade(photoList, true, 1);
                    boolean predMild = signsAnchorsPass1.severityBand() != SeverityBand.NONE;
                    pass1Record = new EvaluationRecord(item.imageId, item.fileName, "arm3_anchors_pass1", item.groundTruthDamaged,
                            predMild, signsAnchorsPass1.severityBand(), signsAnchorsPass1.gradingResult().damageType(),
                            signsAnchorsPass1.gradingResult().confidence(), signsAnchorsPass1.gradingResult().visibleEvidence(),
                            signsAnchorsPass1.rawResult().latencyMs(), signsAnchorsPass1.rawResult().inputTokens(),
                            signsAnchorsPass1.rawResult().outputTokens(), signsAnchorsPass1.rawResult().fromCache(),
                            signsAnchorsPass1.rawResult().json());
                    allRecords.add(pass1Record);
                    jsonlWriter.write(objectMapper.writeValueAsString(pass1Record));
                    jsonlWriter.newLine();
                } catch (Exception e) {
                    log.error("Arm 3 failed for {}: {}", item.fileName, e.getMessage());
                }

                // Arm 4: Signs rubric with anchors, pass 2 (different permutation)
                EvaluationRecord pass2Record = null;
                try {
                    var signsAnchorsPass2 = gradingService.grade(photoList, true, 2);
                    boolean predMild = signsAnchorsPass2.severityBand() != SeverityBand.NONE;
                    pass2Record = new EvaluationRecord(item.imageId, item.fileName, "arm4_anchors_pass2", item.groundTruthDamaged,
                            predMild, signsAnchorsPass2.severityBand(), signsAnchorsPass2.gradingResult().damageType(),
                            signsAnchorsPass2.gradingResult().confidence(), signsAnchorsPass2.gradingResult().visibleEvidence(),
                            signsAnchorsPass2.rawResult().latencyMs(), signsAnchorsPass2.rawResult().inputTokens(),
                            signsAnchorsPass2.rawResult().outputTokens(), signsAnchorsPass2.rawResult().fromCache(),
                            signsAnchorsPass2.rawResult().json());
                    allRecords.add(pass2Record);
                    jsonlWriter.write(objectMapper.writeValueAsString(pass2Record));
                    jsonlWriter.newLine();
                } catch (Exception e) {
                    log.error("Arm 4 failed for {}: {}", item.fileName, e.getMessage());
                }
            }
        }

        // Generate out/smoke_summary.md
        generateSummaryMarkdown(allRecords, summaryPath);
        log.info("Smoke evaluation completed successfully!");
        log.info("  JSONL results: {}", jsonlPath.toAbsolutePath());
        log.info("  Summary report: {}", summaryPath.toAbsolutePath());
    }

    private List<EvaluationItem> loadEvaluationItems(Path labelsPath, Path imagesDir) {
        List<EvaluationItem> items = new ArrayList<>();
        try (FileReader reader = new FileReader(labelsPath.toFile(), StandardCharsets.UTF_8)) {
            CSVParser parser = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setIgnoreHeaderCase(true)
                    .setTrim(true)
                    .build()
                    .parse(reader);

            for (CSVRecord record : parser) {
                String imageId = record.get("image_id");
                String fileName = record.get("file_name");
                String damagedStr = record.get("damaged");
                boolean damaged = "true".equalsIgnoreCase(damagedStr) || "1".equals(damagedStr);

                Path imgPath = imagesDir.resolve(fileName);
                if (Files.exists(imgPath)) {
                    byte[] bytes = Files.readAllBytes(imgPath);
                    items.add(new EvaluationItem(imageId, fileName, damaged, bytes));
                } else {
                    log.warn("Image file not found: {} (skipped)", imgPath);
                }
            }
        } catch (Exception e) {
            log.error("Error reading CSV from {}: {}", labelsPath, e.getMessage());
        }
        return items;
    }

    private void generateSummaryMarkdown(List<EvaluationRecord> records, Path summaryPath) throws IOException {
        StringBuilder sb = new StringBuilder();
        sb.append("# FieldProof Day 1 Smoke Evaluation Summary\n\n");
        sb.append("Generated at: `").append(Instant.now()).append("`\n\n");

        // Metrics tables for arms
        sb.append("## 1. Arm Comparison & Accuracy\n\n");
        sb.append("| Arm | Threshold | Accuracy | Precision | Recall | TP | FP | TN | FN | Avg Latency | Total Tokens |\n");
        sb.append("|---|---|---|---|---|---|---|---|---|---|---|\n");

        formatArmRow(sb, records, "arm1_raw_1pass", "Raw prompt", "predicted boolean", false);
        formatArmRow(sb, records, "arm2_signs_no_anchors", "Signs (no anchors)", "MILD or above", false);
        formatArmRow(sb, records, "arm2_signs_no_anchors", "Signs (no anchors)", "MODERATE or above", true);
        formatArmRow(sb, records, "arm3_anchors_pass1", "Signs (with anchors, pass 1)", "MILD or above", false);
        formatArmRow(sb, records, "arm3_anchors_pass1", "Signs (with anchors, pass 1)", "MODERATE or above", true);
        formatArmRow(sb, records, "arm4_anchors_pass2", "Signs (with anchors, pass 2)", "MILD or above", false);
        formatArmRow(sb, records, "arm4_anchors_pass2", "Signs (with anchors, pass 2)", "MODERATE or above", true);

        // Agreement coverage between pass 1 and pass 2
        sb.append("\n## 2. Anchored Two-Pass Agreement Gate (Coverage)\n\n");
        appendAgreementAnalysis(sb, records);

        // Disagreements list for Step O12 inspection
        sb.append("\n## 3. Disagreements and Failure Inspection (for Step O12)\n\n");
        sb.append("| Image File | Ground Truth | Arm | Predicted Band | Confidence | Visible Evidence |\n");
        sb.append("|---|---|---|---|---|---|\n");

        for (EvaluationRecord r : records) {
            boolean isDamagedPred = r.predictedDamaged();
            if (isDamagedPred != r.groundTruthDamaged()) {
                String evidence = (r.visibleEvidence() == null || r.visibleEvidence().isEmpty())
                        ? "none"
                        : String.join("; ", r.visibleEvidence());
                sb.append(String.format("| `%s` | %s | %s | %s | %.2f | %s |\n",
                        r.fileName(), r.groundTruthDamaged() ? "DAMAGED" : "HEALTHY",
                        r.arm(), r.band() != null ? r.band() : "N/A",
                        r.confidence(), evidence));
            }
        }

        Files.writeString(summaryPath, sb.toString(), StandardCharsets.UTF_8);
    }

    private void formatArmRow(StringBuilder sb, List<EvaluationRecord> records,
                              String armKey, String armLabel, String thresholdLabel, boolean moderateThreshold) {
        int tp = 0, fp = 0, tn = 0, fn = 0;
        long totalLatency = 0;
        long totalTokens = 0;
        int count = 0;

        for (EvaluationRecord r : records) {
            if (!armKey.equals(r.arm())) continue;
            count++;
            totalLatency += r.latencyMs();
            totalTokens += (r.inputTokens() != null ? r.inputTokens() : 0) + (r.outputTokens() != null ? r.outputTokens() : 0);

            boolean pred;
            if (r.band() != null) {
                pred = moderateThreshold
                        ? (r.band() == SeverityBand.MODERATE || r.band() == SeverityBand.SEVERE)
                        : (r.band() != SeverityBand.NONE);
            } else {
                pred = r.predictedDamaged();
            }

            if (pred && r.groundTruthDamaged()) tp++;
            else if (pred && !r.groundTruthDamaged()) fp++;
            else if (!pred && !r.groundTruthDamaged()) tn++;
            else fn++;
        }

        if (count == 0) return;

        double acc = (count > 0) ? (double) (tp + tn) / count : 0.0;
        double prec = (tp + fp > 0) ? (double) tp / (tp + fp) : 0.0;
        double rec = (tp + fn > 0) ? (double) tp / (tp + fn) : 0.0;
        long avgLat = totalLatency / count;

        sb.append(String.format("| %s | %s | %.1f%% | %.1f%% | %.1f%% | %d | %d | %d | %d | %d ms | %d |\n",
                armLabel, thresholdLabel, acc * 100, prec * 100, rec * 100, tp, fp, tn, fn, avgLat, totalTokens));
    }

    private void appendAgreementAnalysis(StringBuilder sb, List<EvaluationRecord> records) {
        Map<String, EvaluationRecord> pass1Map = new HashMap<>();
        Map<String, EvaluationRecord> pass2Map = new HashMap<>();

        for (EvaluationRecord r : records) {
            if ("arm3_anchors_pass1".equals(r.arm())) pass1Map.put(r.imageId(), r);
            if ("arm4_anchors_pass2".equals(r.arm())) pass2Map.put(r.imageId(), r);
        }

        int totalPairs = 0;
        int agreeing = 0;
        int agreedTp = 0, agreedFp = 0, agreedTn = 0, agreedFn = 0;

        for (String id : pass1Map.keySet()) {
            if (pass2Map.containsKey(id)) {
                totalPairs++;
                var p1 = pass1Map.get(id);
                var p2 = pass2Map.get(id);
                if (p1.band() == p2.band()) {
                    agreeing++;
                    boolean pred = p1.band() == SeverityBand.MODERATE || p1.band() == SeverityBand.SEVERE;
                    if (pred && p1.groundTruthDamaged()) agreedTp++;
                    else if (pred && !p1.groundTruthDamaged()) agreedFp++;
                    else if (!pred && !p1.groundTruthDamaged()) agreedTn++;
                    else agreedFn++;
                }
            }
        }

        double coverage = (totalPairs > 0) ? (double) agreeing / totalPairs : 0.0;
        double agreedAcc = (agreeing > 0) ? (double) (agreedTp + agreedTn) / agreeing : 0.0;
        double agreedPrec = (agreedTp + agreedFp > 0) ? (double) agreedTp / (agreedTp + agreedFp) : 0.0;

        sb.append(String.format("- **Total Evaluated Pairs**: %d\n", totalPairs));
        sb.append(String.format("- **Pass Agreement Coverage**: %.1f%% (%d / %d)\n", coverage * 100, agreeing, totalPairs));
        sb.append(String.format("- **Accuracy on Agreeing Subset (Moderate+)**: %.1f%%\n", agreedAcc * 100));
        sb.append(String.format("- **Precision on Agreeing Subset (Moderate+)**: %.1f%%\n\n", agreedPrec * 100));
    }

    private record EvaluationItem(String imageId, String fileName, boolean groundTruthDamaged, byte[] bytes) {}

    public record EvaluationRecord(
            String imageId,
            String fileName,
            String arm,
            boolean groundTruthDamaged,
            boolean predictedDamaged,
            SeverityBand band,
            String damageType,
            double confidence,
            List<String> visibleEvidence,
            long latencyMs,
            Long inputTokens,
            Long outputTokens,
            boolean fromCache,
            String rawJson
    ) {}
}
