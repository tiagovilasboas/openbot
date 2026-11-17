import type { ToolDefinition, ToolPolicy } from "./tool-definition.ts";

export type ToolGrant = { botId: string; toolName: string };

// A tool runs without asking when it is "auto", or when this bot holds an
// always-allow grant for it and the tool opts in with allowAlways.
export function policyFor(
  tool: Pick<ToolDefinition<unknown>, "name" | "policy" | "allowAlways">,
  botId: string,
  grants: readonly ToolGrant[],
): ToolPolicy {
  if (tool.policy === "auto") return "auto";
  if (!tool.allowAlways) return "ask";
  const granted = grants.some(
    (grant) => grant.botId === botId && grant.toolName === tool.name,
  );
  return granted ? "auto" : "ask";
}

/** What the user set for a tool, for every bot. A missing entry means "ask". */
export type ToolLevel = "ask" | "allow" | "block";

export const TOOL_LEVELS: readonly ToolLevel[] = ["ask", "allow", "block"];

export type ToolLevels = Readonly<Record<string, ToolLevel>>;

export const isToolLevel = (value: unknown): value is ToolLevel =>
  typeof value === "string" &&
  (TOOL_LEVELS as readonly string[]).includes(value);

/** "allow" is only on offer for tools that opt in with allowAlways. */
export const canAllow = (tool: Pick<ToolDefinition<unknown>, "allowAlways">) =>
  tool.allowAlways;

export type ToolDecision = ToolPolicy | "block";

/**
 * The single gate of a tool call. Block wins over everything, grants
 * included. Allow runs the tool without asking, but only when it opts in
 * with allowAlways; otherwise it counts as ask. Ask keeps the grant logic.
 */
export function decideTool(
  tool: Pick<ToolDefinition<unknown>, "name" | "policy" | "allowAlways">,
  botId: string,
  grants: readonly ToolGrant[],
  levels: ToolLevels,
): ToolDecision {
  const level = Object.hasOwn(levels, tool.name) ? levels[tool.name] : "ask";
  if (level === "block") return "block";
  if (level === "allow" && canAllow(tool)) return "auto";
  return policyFor(tool, botId, grants);
}
