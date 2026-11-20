import { MAX_TOOL_ARGS_CHARS } from "../../model/tool-wire.ts";
import type { ToolDefinition } from "../../tools/tool-definition.ts";
import { wrapExternalText } from "../../untrusted-text/wrap-external-text.ts";
import { parseMcpConfig, type McpServerConfig } from "../mcp-config.ts";
import {
  cleanDescription,
  liteInputSchema,
  qualifiedToolName,
  resultText,
} from "../mcp-tool-shape.ts";
import {
  createMcpClient,
  McpError,
  type McpClient,
  type McpClientDeps,
} from "./mcp-client.ts";

type Env = Readonly<Record<string, string | undefined>>;
type Args = Record<string, unknown>;

export const MCP_TOOLS_PER_SERVER = 40;
const LIST_TTL_MS = 5 * 60_000;
const LIST_TIMEOUT_MS = 5_000;

type Entry = {
  key: string;
  client: McpClient;
  at: number;
  tools: ToolDefinition<Args>[];
};
const cache = new Map<string, Entry>();

function parseArgs(raw: unknown): { ok: true; args: Args } | { ok: false } {
  if (raw === undefined || raw === null) return { ok: true, args: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
  return JSON.stringify(raw).length <= MAX_TOOL_ARGS_CHARS
    ? { ok: true, args: raw as Args }
    : { ok: false };
}

/** One MCP tool as a loop tool: always asks first, result marked as data. */
export function mcpToolDefinition(
  server: McpServerConfig,
  client: McpClient,
  raw: unknown,
): ToolDefinition<Args> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const tool = raw as Record<string, unknown>;
  if (typeof tool.name !== "string") return null;
  const name = qualifiedToolName(server.name, tool.name);
  if (!name) return null;
  const original = tool.name;
  return {
    name,
    description:
      `[${server.name}] ${cleanDescription(tool.description)}`.trim(),
    parameters: liteInputSchema(tool.inputSchema),
    policy: "ask",
    allowAlways: true,
    timeoutMs: 30_000,
    maxResultChars: 8_000,
    parseArgs,
    async run(args, ctx) {
      try {
        const result = await client.callTool(original, args, ctx.signal);
        const text = resultText(result.content);
        if (result.isError === true)
          return { ok: false, code: "mcp_tool_error" };
        return {
          ok: true,
          text: wrapExternalText(text || "(no text content)"),
          preview: text.slice(0, 200) || original,
        };
      } catch (error) {
        return {
          ok: false,
          code: error instanceof McpError ? error.code : "mcp_failed",
        };
      }
    },
  };
}

async function toolsOf(
  server: McpServerConfig,
  env: Env,
  deps: Pick<McpClientDeps, "fetchImpl">,
  now: number,
): Promise<ToolDefinition<Args>[]> {
  const key = `${server.name} ${server.url} ${server.tokenEnv ?? ""}`;
  const cached = cache.get(server.name);
  if (cached && cached.key === key && now - cached.at < LIST_TTL_MS) {
    return cached.tools;
  }
  const client =
    cached?.key === key
      ? cached.client
      : createMcpClient(server, {
          token: server.tokenEnv ? env[server.tokenEnv] : undefined,
          fetchImpl: deps.fetchImpl,
        });
  try {
    const listed = await client.listTools(AbortSignal.timeout(LIST_TIMEOUT_MS));
    const seen = new Set<string>();
    const tools: ToolDefinition<Args>[] = [];
    for (const raw of listed.slice(0, MCP_TOOLS_PER_SERVER)) {
      const tool = mcpToolDefinition(server, client, raw);
      if (!tool || seen.has(tool.name)) continue;
      seen.add(tool.name);
      tools.push(tool);
    }
    cache.set(server.name, { key, client, at: now, tools });
    return tools;
  } catch {
    // A server that is down only removes its own tools from this turn.
    return [];
  }
}

/** Tools of every configured MCP server; none when unset or invalid. */
export async function loadMcpTools(
  env: Env,
  deps: Pick<McpClientDeps, "fetchImpl"> & { now?: () => number } = {},
): Promise<ToolDefinition<Args>[]> {
  const config = parseMcpConfig(env.OPENBOT_MCP_SERVERS);
  if (!config.ok) return [];
  const now = (deps.now ?? Date.now)();
  const lists = await Promise.all(
    config.servers.map((server) => toolsOf(server, env, deps, now)),
  );
  return lists.flat();
}

/** Drops cached tool lists (tests, or a config change at runtime). */
export function clearMcpToolCache(): void {
  cache.clear();
}
