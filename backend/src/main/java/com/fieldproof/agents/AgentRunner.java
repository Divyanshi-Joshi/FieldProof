package com.fieldproof.agents;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.function.Function;

/**
 * Executes an agent function-calling loop with configurable step and time limits (docs/DAY2 §T2.2).
 */
@Component
public class AgentRunner {

    private static final Logger log = LoggerFactory.getLogger(AgentRunner.class);
    private static final int DEFAULT_MAX_STEPS = 8;
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(60);

    private final ObjectMapper objectMapper;

    public AgentRunner(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Runs an agent function-calling cycle.
     *
     * @param agentName     Identifier for the agent
     * @param registry      Tools available to the agent
     * @param terminalTools Names of tools that cleanly terminate the loop
     * @param stepDispatcher Lambda driving the conversation step with Gemini (or test mock)
     * @return Completed {@link AgentTrace}
     */
    public AgentTrace run(
            String agentName,
            ToolRegistry registry,
            Set<String> terminalTools,
            Function<AgentStepContext, AgentStepResponse> stepDispatcher
    ) {
        AgentTrace.Builder traceBuilder = new AgentTrace.Builder(agentName);
        Instant deadline = Instant.now().plus(DEFAULT_TIMEOUT);

        JsonNode conversationState = objectMapper.createObjectNode();
        int step = 1;

        while (step <= DEFAULT_MAX_STEPS && Instant.now().isBefore(deadline)) {
            AgentStepContext ctx = new AgentStepContext(step, conversationState);
            AgentStepResponse response;

            try {
                response = stepDispatcher.apply(ctx);
            } catch (Exception e) {
                log.error("Agent dispatcher failed on step {}", step, e);
                break;
            }

            if (response == null || response.calledToolName() == null) {
                // Agent finished without calling a tool
                break;
            }

            String toolName = response.calledToolName();
            JsonNode args = response.arguments() != null ? response.arguments() : objectMapper.createObjectNode();

            long t0 = System.currentTimeMillis();
            Tool.ToolResult result = registry.execute(toolName, args);
            long latency = System.currentTimeMillis() - t0;

            traceBuilder.addStep(step, toolName, args, result, latency);

            if (terminalTools.contains(toolName)) {
                traceBuilder.markTerminated(toolName, result.data());
                break;
            }

            conversationState = response.updatedState();
            step++;
        }

        return traceBuilder.build();
    }

    public record AgentStepContext(int stepIndex, JsonNode state) {}
    public record AgentStepResponse(String calledToolName, JsonNode arguments, JsonNode updatedState) {}
}
