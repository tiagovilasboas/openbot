import { parseMcpConfig } from "../../mcp/mcp-config.ts";
import { createMcpClient, McpError } from "../../mcp/server/mcp-client.ts";
import { parseTelegramConfig } from "../../telegram/telegram-config.ts";

type Env = Readonly<Record<string, string | undefined>>;

export type McpServerStatus = {
  name: string;
  host: string;
  /** Tools the server lists, or why it could not be reached. */
  result: { ok: true; tools: number } | { ok: false; code: string };
};

export type IntegrationsStatus = {
  mcp: { configError?: string; servers: McpServerStatus[] };
  telegram: { enabled: boolean; problem?: string; allowedChats: number };
};

/**
 * What the server-side integrations look like right now, for Settings.
 * Names, hosts and counts only: never a URL path, token or chat id.
 */
export async function integrationsStatus(
  env: Env,
  fetchImpl?: typeof fetch,
): Promise<IntegrationsStatus> {
  const config = parseMcpConfig(env.OPENBOT_MCP_SERVERS);
  const servers = config.ok
    ? await Promise.all(
        config.servers.map(async (server): Promise<McpServerStatus> => {
          const client = createMcpClient(server, {
            token: server.tokenEnv ? env[server.tokenEnv] : undefined,
            fetchImpl,
          });
          try {
            const tools = await client.listTools(AbortSignal.timeout(5_000));
            return {
              name: server.name,
              host: new URL(server.url).host,
              result: { ok: true, tools: tools.length },
            };
          } catch (error) {
            return {
              name: server.name,
              host: new URL(server.url).host,
              result: {
                ok: false,
                code: error instanceof McpError ? error.code : "mcp_failed",
              },
            };
          }
        }),
      )
    : [];
  const telegram = parseTelegramConfig(env);
  return {
    mcp: config.ok ? { servers } : { configError: config.error, servers },
    telegram: telegram.enabled
      ? { enabled: true, allowedChats: telegram.allowedChats.size }
      : {
          enabled: false,
          ...(telegram.problem ? { problem: telegram.problem } : {}),
          allowedChats: 0,
        },
  };
}

/** GET /api/integrations/status */
export async function handleIntegrationsStatus(
  env: Env = process.env,
): Promise<Response> {
  return Response.json(await integrationsStatus(env), {
    headers: { "Cache-Control": "no-store" },
  });
}
