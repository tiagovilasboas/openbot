import assert from "node:assert/strict";
import { test } from "node:test";
import {
  disconnectConnection,
  finishConnect,
  startConnect,
} from "./connections-api.ts";

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown, calls: Call[] = []) {
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return fn;
}

const throwing = (async () => {
  throw new TypeError("offline");
}) as unknown as typeof fetch;

test("startConnect returns the https authorize url", async () => {
  const calls: Call[] = [];
  const result = await startConnect(
    "router",
    fakeFetch(200, { authorizeUrl: "https://openrouter.ai/auth?x=1" }, calls),
  );
  assert.deepEqual(result, {
    ok: true,
    authorizeUrl: "https://openrouter.ai/auth?x=1",
  });
  assert.equal(calls[0].url, "/api/connections/router/start");
  assert.equal(calls[0].init.method, "POST");
});

test("startConnect refuses non-https urls, errors and network loss", async () => {
  const bad = await startConnect(
    "router",
    fakeFetch(200, { authorizeUrl: "javascript:alert(1)" }),
  );
  assert.deepEqual(bad, { ok: false, reason: "unavailable" });
  const conflict = await startConnect(
    "router",
    fakeFetch(409, { error: "oauth_unavailable" }),
  );
  assert.deepEqual(conflict, { ok: false, reason: "unavailable" });
  assert.deepEqual(await startConnect("router", throwing), {
    ok: false,
    reason: "network",
  });
});

test("finishConnect posts the return without the id and maps the answer", async () => {
  const calls: Call[] = [];
  const outcome = await finishConnect(
    { id: "router", state: "s1", code: "c1" },
    fakeFetch(200, { status: "connected" }, calls),
  );
  assert.deepEqual(outcome, { status: "connected" });
  assert.equal(calls[0].url, "/api/connections/router/callback");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    state: "s1",
    code: "c1",
  });
  assert.deepEqual(
    await finishConnect({ id: "router", state: "s1" }, throwing),
    { status: "failed", reason: "network" },
  );
});

test("disconnectConnection sends DELETE and reports success", async () => {
  const calls: Call[] = [];
  const okFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
  assert.equal(await disconnectConnection("anthropic", okFetch), true);
  assert.equal(calls[0].url, "/api/connections/anthropic");
  assert.equal(calls[0].init.method, "DELETE");
  assert.equal(await disconnectConnection("anthropic", throwing), false);
});
