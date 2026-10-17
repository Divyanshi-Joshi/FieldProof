package com.fieldproof.agents;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class AgentRunnerTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void testAgentLoopNormalTermination() {
        ToolRegistry registry = new ToolRegistry();
        registry.register(new Tool() {
            @Override public String name() { return "fetch_data"; }
            @Override public String description() { return "Fetches dummy data"; }
            @Override public com.fasterxml.jackson.databind.JsonNode parameterSchema() { return mapper.createObjectNode(); }
            @Override public ToolResult execute(com.fasterxml.jackson.databind.JsonNode arguments) {
                ObjectNode node = mapper.createObjectNode();
                node.put("value", 42);
                return ToolResult.ok(node);
            }
        });

        registry.register(new Tool() {
            @Override public String name() { return "submit_final"; }
            @Override public String description() { return "Terminal tool"; }
            @Override public com.fasterxml.jackson.databind.JsonNode parameterSchema() { return mapper.createObjectNode(); }
            @Override public ToolResult execute(com.fasterxml.jackson.databind.JsonNode arguments) {
                ObjectNode node = mapper.createObjectNode();
                node.put("status", "COMPLETED");
                return ToolResult.ok(node);
            }
        });

        AgentRunner runner = new AgentRunner(mapper);

        AgentTrace trace = runner.run("test-agent", registry, Set.of("submit_final"), ctx -> {
            if (ctx.stepIndex() == 1) {
                return new AgentRunner.AgentStepResponse("fetch_data", mapper.createObjectNode(), mapper.createObjectNode());
            } else {
                return new AgentRunner.AgentStepResponse("submit_final", mapper.createObjectNode(), mapper.createObjectNode());
            }
        });

        assertTrue(trace.terminatedProperly());
        assertEquals("submit_final", trace.terminalToolName());
        assertEquals(2, trace.steps().size());
        assertEquals("COMPLETED", trace.finalResult().get("status").asText());
    }

    @Test
    void testAgentStepCapStopsInfiniteLoop() {
        ToolRegistry registry = new ToolRegistry();
        registry.register(new Tool() {
            @Override public String name() { return "infinite_loop"; }
            @Override public String description() { return "Loops indefinitely"; }
            @Override public com.fasterxml.jackson.databind.JsonNode parameterSchema() { return mapper.createObjectNode(); }
            @Override public ToolResult execute(com.fasterxml.jackson.databind.JsonNode arguments) {
                return ToolResult.ok(mapper.createObjectNode());
            }
        });

        AgentRunner runner = new AgentRunner(mapper);

        AgentTrace trace = runner.run("looping-agent", registry, Set.of("terminal"), ctx ->
                new AgentRunner.AgentStepResponse("infinite_loop", mapper.createObjectNode(), mapper.createObjectNode())
        );

        assertFalse(trace.terminatedProperly());
        assertEquals(8, trace.steps().size()); // Capped at DEFAULT_MAX_STEPS = 8
    }

    @Test
    void testUnknownToolReturnsErrorResult() {
        ToolRegistry registry = new ToolRegistry();
        AgentRunner runner = new AgentRunner(mapper);

        AgentTrace trace = runner.run("unknown-caller", registry, Set.of("terminal"), ctx -> {
            if (ctx.stepIndex() == 1) {
                return new AgentRunner.AgentStepResponse("non_existent_tool", mapper.createObjectNode(), mapper.createObjectNode());
            }
            return null;
        });

        assertEquals(1, trace.steps().size());
        assertFalse(trace.steps().get(0).result().success());
        assertTrue(trace.steps().get(0).result().errorMessage().contains("Unknown tool"));
    }
}
