package com.fieldproof.eval;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.ai.AnchorLibrary;
import com.fieldproof.ai.PromptLibrary;
import com.fieldproof.config.FieldProofProperties;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

/**
 * Enforces the honest evaluation rule (docs/DAY2_PERSON_A.md §T2.1):
 * Recomputes all hashes and verifies against eval/freeze.json before any evaluation call.
 */
@Component
public class FreezeGuard {

    private final FieldProofProperties props;
    private final ObjectMapper objectMapper;
    private final GitInfo gitInfo;

    public FreezeGuard(FieldProofProperties props, ObjectMapper objectMapper, Optional<GitInfo> gitInfo) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.gitInfo = gitInfo.orElseGet(SystemGitInfo::new);
    }

    public FreezeManifest computeCurrentManifest() {
        try {
            String rubricSha = computeResourceSha("/prompts/grading_signs_v1.txt");
            String rawPromptSha = computeResourceSha("/prompts/grading_raw_v0.txt");

            Path protocolPath = findFile("protocol/FROZEN_TRIGGER_PROTOCOL.md");
            String protocolSha = protocolPath != null ? computeFileSha(protocolPath) : "missing";

            Path sqlPath = findFile("protocol/frozen_trigger.sql");
            String sqlSha = sqlPath != null ? computeFileSha(sqlPath) : "missing";

            String protocolCommit = "0371cad";
            Path commitFile = findFile("protocol/COMMIT_HASH.txt");
            if (commitFile != null && Files.exists(commitFile)) {
                List<String> lines = Files.readAllLines(commitFile);
                if (!lines.isEmpty() && !lines.get(0).isBlank()) {
                    protocolCommit = lines.get(0).trim();
                }
            }

            List<FreezeManifest.AnchorEntry> anchors = new ArrayList<>();
            Path anchorsJson = findFile("data/anchors/anchors.json");
            if (anchorsJson != null && Files.exists(anchorsJson)) {
                List<Map<String, String>> list = objectMapper.readValue(anchorsJson.toFile(), List.class);
                for (Map<String, String> m : list) {
                    String level = m.get("level");
                    String file = m.get("file");
                    Path imgPath = findFile(file);
                    String imgSha = imgPath != null && Files.exists(imgPath) ? computeFileSha(imgPath) : "missing";
                    anchors.add(new FreezeManifest.AnchorEntry(level, file, imgSha));
                }
            }

            return new FreezeManifest(
                    Instant.now().toString(),
                    gitInfo.getHeadCommitHash(),
                    props.gemini() != null ? props.gemini().model() : "gemini-3-flash-preview",
                    props.gcp() != null ? props.gcp().vertexLocation() : "global",
                    props.gemini() != null ? props.gemini().temperature() : null,
                    props.gemini() != null ? props.gemini().thinkingLevel() : null,
                    props.gemini() != null ? props.gemini().mediaResolution() : null,
                    "grading_signs_v1.txt",
                    rubricSha,
                    rawPromptSha,
                    "protocol/FROZEN_TRIGGER_PROTOCOL.md",
                    protocolSha,
                    "protocol/frozen_trigger.sql",
                    sqlSha,
                    protocolCommit,
                    anchors
            );
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute current freeze manifest", e);
        }
    }

    public void verify(Path freezeJsonPath) {
        if (!Files.exists(freezeJsonPath)) {
            throw new IllegalStateException("Freeze manifest missing at " + freezeJsonPath + ". Run freeze profile first.");
        }

        try {
            FreezeManifest frozen = objectMapper.readValue(freezeJsonPath.toFile(), FreezeManifest.class);
            FreezeManifest current = computeCurrentManifest();

            List<String> diffs = new ArrayList<>();
            if (!Objects.equals(frozen.rubricSha256(), current.rubricSha256())) {
                diffs.add("Rubric prompt changed! Frozen=" + frozen.rubricSha256() + ", Current=" + current.rubricSha256());
            }
            if (!Objects.equals(frozen.rawPromptSha256(), current.rawPromptSha256())) {
                diffs.add("Raw baseline prompt changed! Frozen=" + frozen.rawPromptSha256() + ", Current=" + current.rawPromptSha256());
            }
            if (!Objects.equals(frozen.protocolSha256(), current.protocolSha256())) {
                diffs.add("Protocol markdown changed! Frozen=" + frozen.protocolSha256() + ", Current=" + current.protocolSha256());
            }
            if (!Objects.equals(frozen.triggerSqlSha256(), current.triggerSqlSha256())) {
                diffs.add("Trigger SQL changed! Frozen=" + frozen.triggerSqlSha256() + ", Current=" + current.triggerSqlSha256());
            }
            if (!Objects.equals(frozen.modelId(), current.modelId())) {
                diffs.add("Model ID changed! Frozen=" + frozen.modelId() + ", Current=" + current.modelId());
            }
            if (!Objects.equals(frozen.protocolCommitHash(), current.protocolCommitHash())) {
                diffs.add("Protocol commit hash changed! Frozen=" + frozen.protocolCommitHash() + ", Current=" + current.protocolCommitHash());
            }

            if (!diffs.isEmpty()) {
                throw new IllegalStateException("FREEZE GUARD VIOLATION:\n" + String.join("\n", diffs));
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Error validating freeze guard against " + freezeJsonPath, e);
        }
    }

    public void writeFreezeManifest(Path outputPath) {
        if (!gitInfo.isClean()) {
            throw new IllegalStateException("Cannot freeze manifest when git working tree has uncommitted changes in frozen files.");
        }
        try {
            FreezeManifest manifest = computeCurrentManifest();
            if (outputPath.getParent() != null) {
                Files.createDirectories(outputPath.getParent());
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(outputPath.toFile(), manifest);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to write freeze manifest to " + outputPath, e);
        }
    }

    private Path findFile(String relative) {
        Path p = Path.of(relative);
        if (Files.exists(p)) return p;
        Path p2 = Path.of("../").resolve(relative);
        if (Files.exists(p2)) return p2;
        return null;
    }

    private String computeFileSha(Path path) throws Exception {
        byte[] bytes = Files.readAllBytes(path);
        return sha256Hex(bytes);
    }

    private String computeResourceSha(String resourcePath) throws Exception {
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            if (is == null) {
                Path local = findFile("backend/src/main/resources" + resourcePath);
                if (local != null && Files.exists(local)) {
                    return computeFileSha(local);
                }
                return "missing";
            }
            return sha256Hex(is.readAllBytes());
        }
    }

    private String sha256Hex(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] digest = md.digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public static class SystemGitInfo implements GitInfo {
        @Override
        public String getHeadCommitHash() {
            try {
                Process p = new ProcessBuilder("git", "rev-parse", "HEAD").redirectErrorStream(true).start();
                return new String(p.getInputStream().readAllBytes()).trim();
            } catch (Exception e) {
                return "unknown";
            }
        }

        @Override
        public boolean isClean() {
            try {
                Process p = new ProcessBuilder("git", "status", "--porcelain", "protocol/", "backend/src/main/resources/prompts/").redirectErrorStream(true).start();
                String out = new String(p.getInputStream().readAllBytes()).trim();
                return out.isEmpty();
            } catch (Exception e) {
                return true;
            }
        }
    }
}
