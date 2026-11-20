// Which MCP servers the server may call, read from OPENBOT_MCP_SERVERS.
// Pure: no network, no file system.

export const MCP_MAX_SERVERS = 8;
const NAME = /^[a-z0-9_-]{1,24}$/;
const ENV_NAME = /^[A-Z][A-Z0-9_]{0,63}$/;

export type McpServerConfig = {
  /** Short id used in tool names: mcp__<name>__<tool>. */
  name: string;
  url: string;
  /** Env var that holds the bearer token; the token itself never is config. */
  tokenEnv?: string;
  /** Lets the server sit on a private or loopback address (self-hosted MCP). */
  allowPrivate: boolean;
};

export type McpConfigResult =
  { ok: true; servers: McpServerConfig[] } | { ok: false; error: string };

function readServer(raw: unknown): McpServerConfig | string {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return "entry is not an object";
  }
  const v = raw as Record<string, unknown>;
  if (typeof v.name !== "string" || !NAME.test(v.name)) {
    return "name must match [a-z0-9_-]{1,24}";
  }
  if (typeof v.url !== "string") return `${v.name}: url is missing`;
  let url: URL;
  try {
    url = new URL(v.url);
  } catch {
    return `${v.name}: url is not valid`;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return `${v.name}: url must be http or https`;
  }
  if (url.username || url.password) {
    return `${v.name}: put credentials in tokenEnv, not in the url`;
  }
  if (v.tokenEnv !== undefined) {
    if (typeof v.tokenEnv !== "string" || !ENV_NAME.test(v.tokenEnv)) {
      return `${v.name}: tokenEnv must be an env var name`;
    }
    if (v.tokenEnv.startsWith("NEXT_PUBLIC_")) {
      return `${v.name}: tokenEnv cannot be a NEXT_PUBLIC_ variable`;
    }
  }
  return {
    name: v.name,
    url: url.href,
    ...(typeof v.tokenEnv === "string" ? { tokenEnv: v.tokenEnv } : {}),
    allowPrivate: v.allowPrivate === true,
  };
}

/** Parses the env value. Unset or empty means no MCP servers, not an error. */
export function parseMcpConfig(raw: string | undefined): McpConfigResult {
  if (!raw?.trim()) return { ok: true, servers: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "OPENBOT_MCP_SERVERS is not JSON" };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "OPENBOT_MCP_SERVERS must be a JSON array" };
  }
  if (parsed.length > MCP_MAX_SERVERS) {
    return { ok: false, error: `at most ${MCP_MAX_SERVERS} MCP servers` };
  }
  const servers: McpServerConfig[] = [];
  for (const entry of parsed) {
    const server = readServer(entry);
    if (typeof server === "string") return { ok: false, error: server };
    if (servers.some((s) => s.name === server.name)) {
      return { ok: false, error: `${server.name}: duplicate name` };
    }
    servers.push(server);
  }
  return { ok: true, servers };
}
