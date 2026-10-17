package com.fieldproof.agents;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Fundamental interface for Gemini Function Calling tools (docs/DAY2_PERSON_A.md §T2.2).
 */
public interface Tool {
    String name();
    String description();
    JsonNode parameterSchema();
    ToolResult execute(JsonNode arguments);

    record ToolResult(boolean success, JsonNode data, String errorMessage) {
        public static ToolResult ok(JsonNode data) {
            return new ToolResult(true, data, null);
        }
        public static ToolResult error(String message) {
            return new ToolResult(false, null, message);
        }
    }
}
