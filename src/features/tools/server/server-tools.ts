import type { DatabaseSync } from "node:sqlite";
import { createToolRegistry, type ToolRegistry } from "../tool-registry.ts";
import { createAskUserTool } from "./ask-user-tool.ts";
import { createGithubListOpenItemsTool } from "./github-list-open-items.ts";
import { createMemoryAddNoteTool } from "./memory-add-note.ts";
import { createReadPageTool } from "./read-page.ts";

export type ServerToolDeps = {
  db: DatabaseSync;
  fetchImpl?: typeof fetch;
  githubToken?: string;
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
  ]);
}
