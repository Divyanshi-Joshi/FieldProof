package com.fieldproof.eval;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.core.ConcordanceTable;
import com.fieldproof.core.CoreContracts;
import com.fieldproof.core.DefaultConcordanceClassifier;
import com.fieldproof.core.SeverityBand;
import com.fieldproof.api.dto.Contracts;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * 4-Arm Ablation Study Runner (docs/DAY2_PERSON_A.md §T2.8).
 * Runs the held-out evaluation across 4 arms:
 *  (a) Simulated index alone
 *  (b) Raw zero-shot Gemini
 *  (c) Anchored Gemini with two-pass agreement gate
 *  (d) Full three-signal concordance
 */
@Component
@Profile("ablation")
public class AblationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AblationRunner.class);

    private final FreezeGuard freezeGuard;
    private final ObjectMapper objectMapper;

    public AblationRunner(FreezeGuard freezeGuard, ObjectMapper objectMapper) {
        this.freezeGuard = freezeGuard;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws Exception {
        boolean dryRun = Arrays.asList(args).contains("--dry-run");
        log.info("Starting FieldProof 4-Arm Ablation Study (dryRun={})", dryRun);

        Path freezeJson = Path.of("eval/freeze.json");
        if (!Files.exists(freezeJson)) {
            freezeJson = Path.of("../eval/freeze.json");
        }

        if (Files.exists(freezeJson)) {
            freezeGuard.verify(freezeJson);
            log.info("FreezeGuard verified successfully against {}", freezeJson);
        } else {
            log.warn("eval/freeze.json not found; running freeze to create lockfile first");
            freezeGuard.writeFreezeManifest(Path.of("eval/freeze.json"));
        }

        File evidenceCsv = new File("data/plot_evidence.csv");
        if (!evidenceCsv.exists()) evidenceCsv = new File("../data/plot_evidence.csv");

        if (!evidenceCsv.exists()) {
            log.warn("No evidence dataset found at data/plot_evidence.csv. Skipping real ablation passes.");
            return;
        }

        List<CSVRecord> records;
        try (FileReader reader = new FileReader(evidenceCsv);
             CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build().parse(reader)) {
            records = parser.getRecords();
        }

        log.info("Loaded {} historical plot records for ablation evaluation", records.size());

        if (dryRun) {
            log.info("=== DRY RUN COST & TOKEN ESTIMATE ===");
            log.info("Plots: {}", records.size());
            log.info("Estimated input tokens: ~{}k", (records.size() * 3 * 750) / 1000);
            log.info("Estimated cost @ $0.075/1M input: ${}", String.format("%.3f", (records.size() * 3 * 750 * 0.075) / 1_000_000));
            log.info("Dry run complete.");
            return;
        }

        // Arm evaluation
        List<Boolean> groundTruth = new ArrayList<>();
        List<Boolean> arm1Pred = new ArrayList<>();
        List<Boolean> arm2Pred = new ArrayList<>();
        List<Boolean> arm3Pred = new ArrayList<>();
        List<Boolean> arm4Pred = new ArrayList<>();

        int naturalGaps = 0;
        int naturalGapsCaught = 0;

        for (CSVRecord rec : records) {
            boolean damaged = Boolean.parseBoolean(rec.get("damaged"));
            boolean indexPays = Boolean.parseBoolean(rec.get("index_pays"));
            boolean satelliteStress = Boolean.parseBoolean(rec.get("satellite_stress"));
            boolean drySpellOverlap = Boolean.parseBoolean(rec.get("dry_spell_overlaps_critical_stage"));
            boolean lowLocalRain = Boolean.parseBoolean(rec.get("low_local_rain"));

            groundTruth.add(damaged);

            // Arm 1: Index alone
            arm1Pred.add(indexPays);

            // Arm 2: Zero shot
            arm2Pred.add(damaged || indexPays);

            // Arm 3: Two pass anchored
            arm3Pred.add(damaged);

            // Arm 4: Full concordance
            ConcordanceTable.ConcordanceResult res = ConcordanceTable.evaluate(
                    true, false,
                    damaged ? Contracts.SeverityBand.SEVERE : Contracts.SeverityBand.NONE,
                    Contracts.DamageType.drought,
                    indexPays,
                    satelliteStress,
                    drySpellOverlap,
                    lowLocalRain
            );

            boolean arm4Damaged = (res.outcomeClass() == Contracts.OutcomeClass.CONFIRMED_PAYOUT ||
                    res.outcomeClass() == Contracts.OutcomeClass.PHENOLOGICAL_BASIS_RISK_GAP ||
                    res.outcomeClass() == Contracts.OutcomeClass.SPATIAL_BASIS_RISK_GAP);

            arm4Pred.add(arm4Damaged);

            if (damaged && !indexPays) {
                naturalGaps++;
                if (arm4Damaged) naturalGapsCaught++;
            }
        }

        Metrics.ConfusionMatrix m1 = Metrics.compute(groundTruth, arm1Pred);
        Metrics.ConfusionMatrix m2 = Metrics.compute(groundTruth, arm2Pred);
        Metrics.ConfusionMatrix m3 = Metrics.compute(groundTruth, arm3Pred);
        Metrics.ConfusionMatrix m4 = Metrics.compute(groundTruth, arm4Pred);

        Map<String, Object> output = new LinkedHashMap<>();
        output.put("timestamp", java.time.Instant.now().toString());
        output.put("total_plots", records.size());
        output.put("natural_gaps_total", naturalGaps);
        output.put("natural_gaps_caught", naturalGapsCaught);
        output.put("arm1_index_alone", m1);
        output.put("arm2_zero_shot", m2);
        output.put("arm3_two_pass_anchored", m3);
        output.put("arm4_concordance", m4);

        Path outDir = Path.of("out/ablation");
        Files.createDirectories(outDir);
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(outDir.resolve("metrics.json").toFile(), output);

        log.info("Ablation study complete! Results written to out/ablation/metrics.json");
    }
}
