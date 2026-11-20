import { checkPublicUrl } from "../../server-guard/guarded-fetch.ts";
import { createPinnedFetch } from "../../server-guard/pinned-fetch.ts";
import type { McpServerConfig } from "../mcp-config.ts";

/** MCP revision this client speaks; servers answer with theirs. */
export const MCP_PROTOCOL_VERSION = "2025-06-18";
/** Largest response body read from an MCP server. */
export const MCP_MAX_RESPONSE_BYTES = 1024 * 1024;

export type McpClientDeps = {
  token?: string;
  /** Overrides the guarded transport (tests). */
  fetchImpl?: typeof fetch;
};

export class McpError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MCP_MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new McpError("mcp_response_too_large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** The JSON-RPC message with this id, from a JSON or an SSE body. */
export function findRpcMessage(
  body: string,
  contentType: string,
  id: number,
): Record<string, unknown> | null {
  const candidates: unknown[] = [];
  if (contentType.includes("text/event-stream")) {
    for (const event of body.split(/\r?\n\r?\n/)) {
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        candidates.push(JSON.parse(data));
      } catch {
        // Not JSON: skipped.
      }
    }
  } else {
    try {
      const parsed = JSON.parse(body);
      candidates.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      return null;
    }
  }
  for (const item of candidates) {
    if (typeof item === "object" && item !== null) {
      const message = item as Record<string, unknown>;
      if (message.id === id) return message;
    }
  }
  return null;
}

/**
 * A minimal MCP client over Streamable HTTP: initialize, tools/list and
 * tools/call. Public servers go through the pinned transport, so a name
 * that resolves to a private address is refused at connect time.
 */
export function createMcpClient(server: McpServerConfig, deps: McpClientDeps) {
  const transport =
    deps.fetchImpl ?? (server.allowPrivate ? fetch : createPinnedFetch());
  let sessionId: string | null = null;
  let nextId = 1;
  let ready: Promise<void> | null = null;

  async function post(
    message: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Response> {
    if (!server.allowPrivate && !deps.fetchImpl) {
      const checked = await checkPublicUrl(server.url);
      if (!checked.ok) throw new McpError(`mcp_${checked.code}`);
    }
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": MCP_PROTOCOL_VERSION,
    };
    if (sessionId) headers["mcp-session-id"] = sessionId;
    if (deps.token) headers.authorization = `Bearer ${deps.token}`;
    let response: Response;
    try {
      response = await transport(server.url, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        redirect: "manual",
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw new McpError("aborted");
      const blocked =
        error instanceof Error && error.message === "blocked_address";
      throw new McpError(blocked ? "mcp_blocked_address" : "mcp_unreachable");
    }
    const session = response.headers.get("mcp-session-id");
    if (session) sessionId = session;
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel().catch(() => undefined);
      throw new McpError("mcp_unauthorized");
    }
    if (response.status >= 300) {
      await response.body?.cancel().catch(() => undefined);
      throw new McpError(`mcp_http_${response.status}`);
    }
    return response;
  }

  async function rpc(
    method: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    const id = nextId++;
    const response = await post({ jsonrpc: "2.0", id, method, params }, signal);
    const body = await readCapped(response);
    const message = findRpcMessage(
      body,
      response.headers.get("content-type") ?? "",
      id,
    );
    if (!message) throw new McpError("mcp_bad_response");
    if (message.error) throw new McpError("mcp_rpc_error");
    const result = message.result;
    if (typeof result !== "object" || result === null) {
      throw new McpError("mcp_bad_response");
    }
    return result as Record<string, unknown>;
  }

  function initialize(signal?: AbortSignal): Promise<void> {
    ready ??= (async () => {
      await rpc(
        "initialize",
        {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "openbot", version: "0.1.0" },
        },
        signal,
      );
      const note = await post(
        { jsonrpc: "2.0", method: "notifications/initialized" },
        signal,
      );
      await note.body?.cancel().catch(() => undefined);
    })().catch((error) => {
      ready = null;
      throw error;
    });
    return ready;
  }

  return {
    async listTools(signal?: AbortSignal): Promise<unknown[]> {
      await initialize(signal);
      const tools: unknown[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < 5; page += 1) {
        const result = await rpc(
          "tools/list",
          cursor ? { cursor } : {},
          signal,
        );
        if (Array.isArray(result.tools)) tools.push(...result.tools);
        cursor =
          typeof result.nextCursor === "string" ? result.nextCursor : undefined;
        if (!cursor) break;
      }
      return tools;
    },
    async callTool(
      name: string,
      args: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<Record<string, unknown>> {
      await initialize(signal);
      return rpc("tools/call", { name, arguments: args }, signal);
    },
  };
}

export type McpClient = ReturnType<typeof createMcpClient>;
