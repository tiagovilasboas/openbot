import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchActiveServerModel,
  testModelConnection,
} from "./test-model-connection.ts";

test("testModelConnection reports success when server responds ok", async () => {
  const spyFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({ ok: true, provider: "router", model: "o3-mini" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const result = await testModelConnection(
    {
      provider: "router",
      baseUrl: "http://localhost:20128/v1",
      model: "o3-mini",
    },
    spyFetch,
  );

  assert.deepEqual(result, {
    ok: true,
    provider: "router",
    model: "o3-mini",
  });
});

test("testModelConnection reports failure when server responds with error", async () => {
  const spyFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        ok: false,
        error: "provider_unreachable",
        provider: "local",
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );

  const result = await testModelConnection(
    {
      provider: "local",
      baseUrl: "http://localhost:11434",
      model: "llama3",
    },
    spyFetch,
  );

  assert.deepEqual(result, {
    ok: false,
    error: "provider_unreachable",
    provider: "local",
  });
});

test("testModelConnection handles network failure", async () => {
  const downFetch: typeof fetch = async () => {
    throw new Error("Network down");
  };

  const result = await testModelConnection(
    {
      provider: "anthropic",
      apiKey: "sk-ant-test",
      model: "claude-3-5-sonnet",
    },
    downFetch,
  );

  assert.deepEqual(result, {
    ok: false,
    error: "network_error",
  });
});

test("fetchActiveServerModel returns active provider details or unconfigured", async () => {
  const okFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({ configured: true, provider: "local", model: "llama3" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const active = await fetchActiveServerModel(okFetch);
  assert.deepEqual(active, {
    configured: true,
    provider: "local",
    model: "llama3",
  });

  const unconfiguredFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ configured: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const inactive = await fetchActiveServerModel(unconfiguredFetch);
  assert.deepEqual(inactive, {
    configured: false,
    provider: undefined,
    model: undefined,
  });
});

test("testModelConnection reports success for sandbox provider", async () => {
  const spyFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({ ok: true, provider: "sandbox", model: "chief-sim-v1" }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  const result = await testModelConnection(
    {
      provider: "sandbox",
      model: "chief-sim-v1",
    },
    spyFetch,
  );

  assert.deepEqual(result, {
    ok: true,
    provider: "sandbox",
    model: "chief-sim-v1",
  });
});
