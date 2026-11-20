import assert from "node:assert/strict";
import test from "node:test";
import { integrationsStatus } from "./server/integrations-status.ts";

const TOKEN = `123456:${"a".repeat(35)}`;

test("nothing configured reads as off and empty", async () => {
  assert.deepEqual(await integrationsStatus({}), {
    mcp: { servers: [] },
    telegram: { enabled: false, allowedChats: 0 },
  });
});

test("the status names hosts and counts, never secrets", async () => {
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as {
      id?: number;
      method: string;
    };
    if (body.id === undefined) return new Response(null, { status: 202 });
    const result =
      body.method === "tools/list"
        ? { tools: [{ name: "a" }, { name: "b" }] }
        : {};
    return Response.json({ jsonrpc: "2.0", id: body.id, result });
  }) as typeof fetch;
  const env = {
    OPENBOT_MCP_SERVERS: JSON.stringify([
      { name: "ok", url: "https://mcp.example/secret/path", tokenEnv: "T" },
    ]),
    T: "very-secret",
    TELEGRAM_BOT_TOKEN: TOKEN,
    TELEGRAM_ALLOWED_CHATS: "1,2",
  };
  const status = await integrationsStatus(env, fetchImpl);
  assert.deepEqual(status, {
    mcp: {
      servers: [
        { name: "ok", host: "mcp.example", result: { ok: true, tools: 2 } },
      ],
    },
    telegram: { enabled: true, allowedChats: 2 },
  });
  const text = JSON.stringify(status);
  for (const secret of ["very-secret", "secret/path", TOKEN]) {
    assert.equal(text.includes(secret), false, secret);
  }
});

test("a bad config and a down server are reported, not thrown", async () => {
  const bad = await integrationsStatus({ OPENBOT_MCP_SERVERS: "{" });
  assert.equal(bad.mcp.configError, "OPENBOT_MCP_SERVERS is not JSON");
  const down = await integrationsStatus(
    {
      OPENBOT_MCP_SERVERS: JSON.stringify([
        { name: "x", url: "https://x.example/mcp" },
      ]),
      TELEGRAM_BOT_TOKEN: TOKEN,
    },
    (async () => new Response("no", { status: 401 })) as typeof fetch,
  );
  assert.deepEqual(down.mcp.servers[0].result, {
    ok: false,
    code: "mcp_unauthorized",
  });
  assert.deepEqual(down.telegram, {
    enabled: false,
    problem: "no_allowed_chats",
    allowedChats: 0,
  });
});
