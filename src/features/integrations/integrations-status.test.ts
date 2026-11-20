import assert from "node:assert/strict";
import test from "node:test";
import { integrationsStatus } from "./server/integrations-status.ts";

test("nothing configured reads as empty", async () => {
  assert.deepEqual(await integrationsStatus({}), { mcp: { servers: [] } });
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
  };
  const status = await integrationsStatus(env, fetchImpl);
  assert.deepEqual(status, {
    mcp: {
      servers: [
        { name: "ok", host: "mcp.example", result: { ok: true, tools: 2 } },
      ],
    },
  });
  const text = JSON.stringify(status);
  for (const secret of ["very-secret", "secret/path"]) {
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
    },
    (async () => new Response("no", { status: 401 })) as typeof fetch,
  );
  assert.deepEqual(down.mcp.servers[0].result, {
    ok: false,
    code: "mcp_unauthorized",
  });
});
