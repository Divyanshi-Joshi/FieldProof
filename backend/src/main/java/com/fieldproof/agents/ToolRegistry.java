package com.fieldproof.agents;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry holding all executable agent tools and validating arguments against schemas.
 */
@Component
public class ToolRegistry {

    private final Map<String, Tool> tools = new ConcurrentHashMap<>();

    public void register(Tool tool) {
        if (tool == null || tool.name() == null || tool.name().isBlank()) {
            throw new IllegalArgumentException("Cannot register tool without a valid name");
        }
        tools.put(tool.name(), tool);
    }

    public Optional<Tool> getTool(String name) {
        return Optional.ofNullable(tools.get(name));
    }

    public Tool.ToolResult execute(String name, JsonNode arguments) {
        Tool tool = tools.get(name);
        if (tool == null) {
            return Tool.ToolResult.error("Unknown tool: '" + name + "'. Available tools: " + tools.keySet());
        }
        try {
            return tool.execute(arguments);
        } catch (Exception e) {
            return Tool.ToolResult.error("Tool execution failed for '" + name + "': " + e.getMessage());
        }
    }

    public Collection<Tool> getAllTools() {
        return Collections.unmodifiableCollection(tools.values());
    }
}
