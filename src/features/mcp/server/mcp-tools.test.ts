import assert from "node:assert/strict";
import test from "node:test";
import type { McpServerConfig } from "../mcp-config.ts";
import { createMcpClient, findRpcMessage } from "./mcp-client.ts";
import { clearMcpToolCache, loadMcpTools } from "./mcp-tools.ts";

type Seen = { headers: Headers; body: Record<string, unknown> };

/** A fake MCP server: initialize, tools/list and tools/call. */
function fakeServer(options: { sse?: boolean; failList?: boolean } = {}) {
  const seen: Seen[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    seen.push({ headers: new Headers(init.headers), body });
    if (body.id === undefined) return new Response(null, { status: 202 });
    let result: unknown;
    if (body.method === "initialize")
      result = { protocolVersion: "2025-06-18" };
    else if (body.method === "tools/list") {
      if (options.failList) return new Response("no", { status: 500 });
      result = {
        tools: [
          {
            name: "create.issue",
            description: "Create an issue",
            inputSchema: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
            },
          },
          { name: "boom", inputSchema: { type: "object" } },
        ],
      };
    } else {
      const params = body.params as {
        name: string;
        arguments: { title?: string };
      };
      result =
        params.name === "boom"
          ? { isError: true, content: [{ type: "text", text: "nope" }] }
          : {
              content: [
                { type: "text", text: `made ${params.arguments.title}` },
              ],
            };
    }
    const message = JSON.stringify({ jsonrpc: "2.0", id: body.id, result });
    return options.sse
      ? new Response(`event: message\ndata: ${message}\n\n`, {
          headers: {
            "content-type": "text/event-stream",
            "mcp-session-id": "s1",
          },
        })
      : new Response(message, {
          headers: {
            "content-type": "application/json",
            "mcp-session-id": "s1",
          },
        });
  }) as typeof fetch;
  return { seen, fetchImpl };
}

const env = (extra: Record<string, string> = {}) => ({
  OPENBOT_MCP_SERVERS: JSON.stringify([
    {
      name: "tracker",
      url: "https://mcp.example/mcp",
      tokenEnv: "TRACKER_TOKEN",
    },
  ]),
  TRACKER_TOKEN: "secret-token",
  ...extra,
});

const ctx = { botId: "b", signal: new AbortController().signal };

test("tools load, ask first and wrap their result as data", async () => {
  clearMcpToolCache();
  const server = fakeServer();
  const tools = await loadMcpTools(env(), { fetchImpl: server.fetchImpl });
  assert.deepEqual(
    tools.map((t) => t.name),
    ["mcp__tracker__create_issue", "mcp__tracker__boom"],
  );
  const [create, boom] = tools;
  assert.equal(create.policy, "ask");
  assert.match(create.description, /^\[tracker\] Create an issue/);
  const result = await create.run({ title: "Bug" }, ctx);
  assert.ok(result.ok);
  assert.match(result.text, /<external-data>\nmade Bug\n<\/external-data>/);
  assert.deepEqual(await boom.run({}, ctx), {
    ok: false,
    code: "mcp_tool_error",
  });
  const call = server.seen.find((s) => s.body.method === "tools/call")!;
  assert.equal(call.headers.get("authorization"), "Bearer secret-token");
  assert.equal(call.headers.get("mcp-session-id"), "s1");
  assert.equal((call.body.params as { name: string }).name, "create.issue");
});

test("an SSE answer works the same", async () => {
  clearMcpToolCache();
  const server = fakeServer({ sse: true });
  const tools = await loadMcpTools(env(), { fetchImpl: server.fetchImpl });
  const result = await tools[0].run({ title: "X" }, ctx);
  assert.ok(result.ok && result.text.includes("made X"));
});

test("a failing server only drops its own tools", async () => {
  clearMcpToolCache();
  const server = fakeServer({ failList: true });
  assert.deepEqual(
    await loadMcpTools(env(), { fetchImpl: server.fetchImpl }),
    [],
  );
  assert.deepEqual(await loadMcpTools({ OPENBOT_MCP_SERVERS: "{" }), []);
});

test("the tool list is cached for five minutes", async () => {
  clearMcpToolCache();
  const server = fakeServer();
  let now = 0;
  await loadMcpTools(env(), { fetchImpl: server.fetchImpl, now: () => now });
  now = 60_000;
  await loadMcpTools(env(), { fetchImpl: server.fetchImpl, now: () => now });
  const lists = () =>
    server.seen.filter((s) => s.body.method === "tools/list").length;
  assert.equal(lists(), 1);
  now = 6 * 60_000;
  await loadMcpTools(env(), { fetchImpl: server.fetchImpl, now: () => now });
  assert.equal(lists(), 2);
});

test("a public server on a private address is refused", async () => {
  const server: McpServerConfig = {
    name: "x",
    url: "http://127.0.0.1:1/mcp",
    allowPrivate: false,
  };
  const client = createMcpClient(server, {});
  await assert.rejects(client.listTools(), { code: "mcp_blocked_address" });
});

test("rpc messages are found by id in JSON and SSE bodies", () => {
  assert.deepEqual(
    findRpcMessage('{"id":2,"result":{}}', "application/json", 2),
    { id: 2, result: {} },
  );
  assert.equal(findRpcMessage('{"id":1}', "application/json", 2), null);
  assert.deepEqual(
    findRpcMessage(
      'data: {"id":9}\n\ndata: {"id":3,"result":1}\n\n',
      "text/event-stream",
      3,
    ),
    { id: 3, result: 1 },
  );
});
