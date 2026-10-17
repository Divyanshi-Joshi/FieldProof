package com.fieldproof.eval;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fieldproof.config.FieldProofProperties;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class FreezeGuardTest {

    private ObjectMapper objectMapper;
    private FieldProofProperties props;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        props = new FieldProofProperties(
                new FieldProofProperties.Gcp("test-proj", "global"),
                new FieldProofProperties.Gemini("gemini-3-flash-preview", "0.0", "low", "default", 4, 4),
                null,
                null
        );
    }

    @Test
    void testComputeAndVerifyClean(@TempDir Path tempDir) {
        GitInfo fakeGit = new GitInfo() {
            @Override public String getHeadCommitHash() { return "abc1234"; }
            @Override public boolean isClean() { return true; }
        };

        FreezeGuard guard = new FreezeGuard(props, objectMapper, Optional.of(fakeGit));
        Path freezeJson = tempDir.resolve("freeze.json");
        guard.writeFreezeManifest(freezeJson);

        assertTrue(Files.exists(freezeJson));
        assertDoesNotThrow(() -> guard.verify(freezeJson));
    }

    @Test
    void testRefusesToWriteWhenDirty(@TempDir Path tempDir) {
        GitInfo dirtyGit = new GitInfo() {
            @Override public String getHeadCommitHash() { return "abc1234"; }
            @Override public boolean isClean() { return false; }
        };

        FreezeGuard guard = new FreezeGuard(props, objectMapper, Optional.of(dirtyGit));
        Path freezeJson = tempDir.resolve("freeze.json");

        assertThrows(IllegalStateException.class, () -> guard.writeFreezeManifest(freezeJson));
    }

    @Test
    void testFailsWhenFrozenPromptDiffers(@TempDir Path tempDir) throws Exception {
        GitInfo fakeGit = new GitInfo() {
            @Override public String getHeadCommitHash() { return "abc1234"; }
            @Override public boolean isClean() { return true; }
        };

        FreezeGuard guard = new FreezeGuard(props, objectMapper, Optional.of(fakeGit));
        Path freezeJson = tempDir.resolve("freeze.json");
        guard.writeFreezeManifest(freezeJson);

        // Tamper with the freeze json
        FreezeManifest original = objectMapper.readValue(freezeJson.toFile(), FreezeManifest.class);
        FreezeManifest tampered = new FreezeManifest(
                original.timestamp(),
                original.gitHead(),
                original.modelId(),
                original.vertexLocation(),
                original.temperature(),
                original.thinkingLevel(),
                original.mediaResolution(),
                original.rubricFile(),
                "tampered_rubric_sha256",
                original.rawPromptSha256(),
                original.protocolFile(),
                original.protocolSha256(),
                original.triggerSqlFile(),
                original.triggerSqlSha256(),
                original.protocolCommitHash(),
                original.anchors()
        );
        objectMapper.writeValue(freezeJson.toFile(), tampered);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> guard.verify(freezeJson));
        assertTrue(ex.getMessage().contains("Rubric prompt changed!"));
    }
}
