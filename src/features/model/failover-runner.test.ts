import assert from "node:assert/strict";
import test from "node:test";
import { executeWithFailover } from "./failover-runner.ts";
import type { ModelAdapter, ModelRequest } from "./model-adapter.ts";

const sampleRequest: ModelRequest = {
  language: "pt",
  messages: [{ role: "user", text: "Olá" }],
};

test("executeWithFailover returns primaryResult if primary succeeds", async () => {
  let fallbackCalled = false;
  const primaryAdapter: ModelAdapter = {
    provider: "router",
    model: "openrouter/free",
    async generateReply() {
      return { ok: true, provider: "router", text: "Resposta primária" };
    },
  };
  const fallbackAdapter: ModelAdapter = {
    provider: "router",
    model: "fallback-model",
    async generateReply() {
      fallbackCalled = true;
      return { ok: true, provider: "router", text: "Resposta fallback" };
    },
  };

  const result = await executeWithFailover({
    request: sampleRequest,
    primaryAdapter,
    fallbackAdapter,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.text, "Resposta primária");
    assert.equal(result.failover, undefined);
  }
  assert.equal(fallbackCalled, false);
});

test("executeWithFailover calls fallbackAdapter when primary fails", async () => {
  const primaryAdapter: ModelAdapter = {
    provider: "router",
    model: "primary-model",
    async generateReply() {
      return {
        ok: false,
        code: "provider_rejected",
        provider: "router",
        detail: "429: Rate limit exceeded",
      };
    },
  };
  const fallbackAdapter: ModelAdapter = {
    provider: "router",
    model: "fallback-model",
    async generateReply() {
      return { ok: true, provider: "router", text: "Resposta do fallback" };
    },
  };

  const result = await executeWithFailover({
    request: sampleRequest,
    primaryAdapter,
    fallbackAdapter,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.text, "Resposta do fallback");
    assert.ok(result.failover);
    assert.equal(result.failover?.fromModel, "primary-model");
    assert.equal(result.failover?.toModel, "fallback-model");
    assert.equal(result.failover?.reason, "429: Rate limit exceeded");
  }
});

test("executeWithFailover returns failure when both primary and fallback fail", async () => {
  const primaryAdapter: ModelAdapter = {
    provider: "router",
    model: "primary-model",
    async generateReply() {
      return {
        ok: false,
        code: "provider_unreachable",
        provider: "router",
      };
    },
  };
  const fallbackAdapter: ModelAdapter = {
    provider: "router",
    model: "fallback-model",
    async generateReply() {
      return {
        ok: false,
        code: "provider_rejected",
        provider: "router",
        detail: "503: Service Unavailable",
      };
    },
  };

  const result = await executeWithFailover({
    request: sampleRequest,
    primaryAdapter,
    fallbackAdapter,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "provider_rejected");
  }
});
