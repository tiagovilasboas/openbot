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
