package com.fieldproof.agents;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Audit trace of an agent's multi-step tool calling loop.
 */
public record AgentTrace(
        String agentName,
        Instant startedAt,
        Instant completedAt,
        List<Step> steps,
        boolean terminatedProperly,
        String terminalToolName,
        JsonNode finalResult
) {
    public record Step(
            int stepIndex,
            String toolName,
            JsonNode arguments,
            Tool.ToolResult result,
            long latencyMs
    ) {}

    public static class Builder {
        private final String agentName;
        private final Instant startedAt = Instant.now();
        private final List<Step> steps = new ArrayList<>();
        private boolean terminatedProperly = false;
        private String terminalToolName;
        private JsonNode finalResult;

        public Builder(String agentName) {
            this.agentName = agentName;
        }

        public void addStep(int index, String toolName, JsonNode args, Tool.ToolResult result, long latencyMs) {
            steps.add(new Step(index, toolName, args, result, latencyMs));
        }

        public void markTerminated(String terminalToolName, JsonNode finalResult) {
            this.terminatedProperly = true;
            this.terminalToolName = terminalToolName;
            this.finalResult = finalResult;
        }

        public AgentTrace build() {
            return new AgentTrace(
                    agentName,
                    startedAt,
                    Instant.now(),
                    Collections.unmodifiableList(steps),
                    terminatedProperly,
                    terminalToolName,
                    finalResult
            );
        }
    }
}
