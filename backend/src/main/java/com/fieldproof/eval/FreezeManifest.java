package com.fieldproof.eval;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Immutable freeze manifest capturing the cryptographic hashes of all evaluation-critical files
 * and runtime configurations as specified in docs/DAY2_PERSON_A.md §T2.1.
 */
public record FreezeManifest(
        @JsonProperty("timestamp") String timestamp,
        @JsonProperty("git_head") String gitHead,
        @JsonProperty("model_id") String modelId,
        @JsonProperty("vertex_location") String vertexLocation,
        @JsonProperty("temperature") String temperature,
        @JsonProperty("thinking_level") String thinkingLevel,
        @JsonProperty("media_resolution") String mediaResolution,
        @JsonProperty("rubric_file") String rubricFile,
        @JsonProperty("rubric_sha256") String rubricSha256,
        @JsonProperty("raw_prompt_sha256") String rawPromptSha256,
        @JsonProperty("protocol_file") String protocolFile,
        @JsonProperty("protocol_sha256") String protocolSha256,
        @JsonProperty("trigger_sql_file") String triggerSqlFile,
        @JsonProperty("trigger_sql_sha256") String triggerSqlSha256,
        @JsonProperty("protocol_commit_hash") String protocolCommitHash,
        @JsonProperty("anchors") List<AnchorEntry> anchors
) {
    public record AnchorEntry(
            @JsonProperty("level") String level,
            @JsonProperty("file_name") String fileName,
            @JsonProperty("sha256") String sha256
    ) {}
}
