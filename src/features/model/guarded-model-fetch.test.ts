import assert from "node:assert/strict";
import test from "node:test";
import { createAnthropicAdapter } from "./anthropic-adapter.ts";
import {
  BlockedBaseUrlError,
  CHAT_TIMEOUT_MS,
  modelFetch,
  TEST_TIMEOUT_MS,
} from "./guarded-model-fetch.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import type { FetchLike, ModelRequest } from "./model-adapter.ts";
import { createRouterAdapter } from "./router-adapter.ts";
import { selectAdapter } from "./select-adapter.ts";

const request: ModelRequest = {
  language: "en",
  messages: [{ role: "user", text: "hi" }],
};
const privateDns = async () => ["10.0.0.9"];

function recordingFetch(response: Response) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response.clone();
  };
  return { impl, calls };
}

test("modelFetch refuses redirects and sets a timeout signal", async () => {
  const { impl, calls } = recordingFetch(new Response("{}"));
  await modelFetch(impl, "https://example.com/x", { method: "POST" }, {});
  assert.equal(calls[0].init.redirect, "error");
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.equal(calls[0].init.method, "POST");
});

test("timeout constants are 30s for chat and 15s for the connection test", () => {
  assert.equal(CHAT_TIMEOUT_MS, 30_000);
  assert.equal(TEST_TIMEOUT_MS, 15_000);
});

test("modelFetch aborts the call once the timeout elapses", async () => {
  const hanging: FetchLike = (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(init.signal?.reason),
      );
    });
  // AbortSignal.timeout timers are unref'd; keep the loop alive for the test.
  const keepAlive = setTimeout(() => {}, 2_000);
  try {
    await assert.rejects(
      modelFetch(hanging, "https://example.com/x", {}, { timeoutMs: 20 }),
    );
  } finally {
    clearTimeout(keepAlive);
  }
});

test("modelFetch never calls fetch for a blocked guarded URL", async () => {
  const { impl, calls } = recordingFetch(new Response("{}"));
  await assert.rejects(
    modelFetch(impl, "http://169.254.169.254/latest", {}, { guardUrl: true }),
    BlockedBaseUrlError,
  );
  await assert.rejects(
    modelFetch(
      impl,
      "https://evil.example/",
      {},
      {
        guardUrl: true,
        resolver: privateDns,
      },
    ),
    BlockedBaseUrlError,
  );
  assert.equal(calls.length, 0);
});

test("a guarded URL on loopback is fetched", async () => {
  const { impl, calls } = recordingFetch(new Response("{}"));
  await modelFetch(
    impl,
    "http://localhost:11434/api/chat",
    {},
    { guardUrl: true },
  );
  assert.equal(calls.length, 1);
});

test("router adapter reports blocked_base_url without calling fetch", async () => {
  const { impl, calls } = recordingFetch(new Response("{}"));
  const adapter = createRouterAdapter({
    baseUrl: "http://192.168.1.1/v1",
    model: "m",
    guardUrl: true,
    fetchImpl: impl,
  });
  const result = await adapter.generateReply(request);
  assert.deepEqual(result, {
    ok: false,
    code: "blocked_base_url",
    provider: "router",
  });
  assert.equal(calls.length, 0);
});

test("local adapter reports blocked_base_url for a rebinding-style hostname", async () => {
  const { impl, calls } = recordingFetch(new Response("{}"));
  const adapter = createLocalAdapter({
    baseUrl: "http://innocent.example",
    model: "m",
    guardUrl: true,
    resolver: privateDns,
    fetchImpl: impl,
  });
  const result = await adapter.generateReply(request);
  assert.equal(!result.ok && result.code, "blocked_base_url");
  assert.equal(calls.length, 0);
});

test("a redirect error becomes provider_unreachable, not a leak", async () => {
  const redirecting: FetchLike = async () => {
    throw new TypeError("fetch failed: redirect to http://169.254.169.254");
  };
  const adapter = createRouterAdapter({
    baseUrl: "https://router.example/v1",
    model: "m",
    fetchImpl: redirecting,
    resolver: async () => ["104.18.1.1"],
    guardUrl: true,
  });
  const result = await adapter.generateReply(request);
  assert.deepEqual(result, {
    ok: false,
    code: "provider_unreachable",
    provider: "router",
  });
});

test("upstream error text is not echoed, only status and a fixed tag", async () => {
  const secretText = "Bearer sk-live-123 at http://10.0.0.1/internal";
  const upstream = () =>
    new Response(JSON.stringify({ error: { message: secretText } }), {
      status: 401,
    });
  for (const make of [
    (fetchImpl: FetchLike) =>
      createRouterAdapter({
        baseUrl: "http://localhost:1",
        model: "m",
        fetchImpl,
      }),
    (fetchImpl: FetchLike) =>
      createAnthropicAdapter({ apiKey: "k", model: "m", fetchImpl }),
  ]) {
    const result = await make(async () => upstream()).generateReply(request);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.detail, "401: unauthorized");
      assert.ok(!JSON.stringify(result).includes("sk-live"));
      assert.ok(!JSON.stringify(result).includes("10.0.0.1"));
    }
  }
});

test("a 400 about the model keeps the model hint without upstream text", async () => {
  const adapter = createRouterAdapter({
    baseUrl: "http://localhost:1",
    model: "m",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({ error: { message: "x is not a valid model ID" } }),
        {
          status: 400,
        },
      ),
  });
  const result = await adapter.generateReply(request);
  assert.equal(!result.ok && result.detail, "400: invalid_model");
});

test("selectAdapter guards client configs but not server env URLs", async () => {
  const { impl, calls } = recordingFetch(new Response("{}", { status: 500 }));
  const client = selectAdapter(
    {},
    { provider: "router", baseUrl: "http://10.1.2.3/v1", model: "m" },
    impl,
  );
  const blocked = await client?.generateReply(request);
  assert.equal(blocked && !blocked.ok && blocked.code, "blocked_base_url");
  assert.equal(calls.length, 0);

  const server = selectAdapter(
    { ROUTER_URL: "http://10.1.2.3/v1", ROUTER_MODEL: "m" },
    null,
    impl,
  );
  await server?.generateReply(request);
  assert.equal(calls.length, 1);
});

test("selectAdapter passes the network timeout down to the call", async () => {
  const { impl, calls } = recordingFetch(new Response("{}", { status: 500 }));
  const adapter = selectAdapter(
    {},
    { provider: "local", baseUrl: "http://localhost:11434", model: "m" },
    impl,
    { timeoutMs: 5 },
  );
  await adapter?.generateReply(request);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.equal(calls[0].init.redirect, "error");
});
