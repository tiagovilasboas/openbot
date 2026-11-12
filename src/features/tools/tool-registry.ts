import type { ToolSpec } from "../model/tool-wire.ts";
import type { ToolDefinition } from "./tool-definition.ts";

export type ToolRegistry = ReadonlyMap<string, ToolDefinition<unknown>>;

/** Tools by name; a duplicate name is a programming error. */
export function createToolRegistry(
  // Each tool narrows its own args; the loop only passes back what parseArgs gave.
  tools: readonly ToolDefinition<any>[],
): ToolRegistry {
  const registry = new Map<string, ToolDefinition<unknown>>();
  for (const tool of tools) {
    if (registry.has(tool.name)) {
      throw new Error(`duplicate tool name: ${tool.name}`);
    }
    registry.set(tool.name, tool as ToolDefinition<unknown>);
  }
  return registry;
}

/** The neutral specs the model sees: name, description and parameters only. */
export function toolSpecs(registry: ToolRegistry): ToolSpec[] {
  return [...registry.values()].map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
