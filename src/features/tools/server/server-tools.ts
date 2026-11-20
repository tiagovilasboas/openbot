import type { DatabaseSync } from "node:sqlite";
import type { ToolDefinition } from "../tool-definition.ts";
import { createToolRegistry, type ToolRegistry } from "../tool-registry.ts";
import { createAskUserTool } from "./ask-user-tool.ts";
import { createCreateBotTool, createUpdateBotTool } from "./bot-tools.ts";
import { createGithubListOpenItemsTool } from "./github-list-open-items.ts";
import { createMemoryAddNoteTool } from "./memory-add-note.ts";
import { createReadPageTool } from "./read-page.ts";
import { createWakeupTool } from "../../routines/server/wakeup-tool.ts";
import { workspaceTools } from "../../workspace/server/workspace-tools.ts";

export type ServerToolDeps = {
  db: DatabaseSync;
  fetchImpl?: typeof fetch;
  githubToken?: string;
  /** Absolute folder holding one subfolder per bot (OPENBOT_WORKSPACE_DIR). */
  workspaceRoot?: string;
  /** Tools loaded before the turn, e.g. from MCP servers. */
  extraTools?: readonly ToolDefinition<Record<string, unknown>>[];
};

/** The v1 tool set, wired to the server's store and network. */
export function serverToolRegistry(deps: ServerToolDeps): ToolRegistry {
  return createToolRegistry([
    createGithubListOpenItemsTool({
      fetchImpl: deps.fetchImpl,
      token: deps.githubToken,
    }),
    createMemoryAddNoteTool(deps.db),
    createReadPageTool({ fetchImpl: deps.fetchImpl }),
    createAskUserTool(),
    createCreateBotTool(deps.db),
    createUpdateBotTool(deps.db),
    createWakeupTool(deps.db),
    ...workspaceTools(deps.workspaceRoot),
    ...(deps.extraTools ?? []),
  ]);
}
