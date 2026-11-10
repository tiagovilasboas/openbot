import assert from "node:assert/strict";
import test from "node:test";
import { createAnthropicAdapter } from "./anthropic-adapter.ts";
import { executeWithFailover } from "./failover-runner.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import type { ModelAdapter, ModelRequest } from "./model-adapter.ts";
import { createRouterAdapter } from "./router-adapter.ts";
import {
  anthropicUsage,
  ollamaUsage,
  openAiUsage,
  readTokenUsage,
  tokenUsage,
} from "./token-usage.ts";

const request: ModelRequest = {
  language: "en",
  messages: [{ role: "user", text: "hi" }],
};

test("each provider names the counts differently and maps to one shape", () => {
  assert.deepEqual(
    anthropicUsage({ usage: { input_tokens: 3, output_tokens: 5 } }),
    {
      inputTokens: 3,
      outputTokens: 5,
    },
  );
  assert.deepEqual(
    openAiUsage({ usage: { prompt_tokens: 7, completion_tokens: 2 } }),
    { inputTokens: 7, outputTokens: 2 },
  );
  assert.deepEqual(ollamaUsage({ prompt_eval_count: 11, eval_count: 4 }), {
    inputTokens: 11,
    outputTokens: 4,
  });
});

test("an absent usage stays absent, and one side alone is kept as is", () => {
  assert.equal(anthropicUsage({}), undefined);
  assert.equal(anthropicUsage(null), undefined);
  assert.equal(openAiUsage({ choices: [] }), undefined);
  assert.equal(openAiUsage({ usage: {} }), undefined);
  assert.equal(ollamaUsage({ message: { content: "x" } }), undefined);
  assert.deepEqual(openAiUsage({ usage: { prompt_tokens: 9 } }), {
    inputTokens: 9,
  });
});

test("invalid counts are dropped, never repaired or guessed", () => {
  assert.equal(tokenUsage("12", -1), undefined);
  assert.equal(tokenUsage(Number.NaN, Infinity), undefined);
  assert.deepEqual(tokenUsage(-4, 6), { outputTokens: 6 });
  assert.deepEqual(readTokenUsage({ inputTokens: 1, outputTokens: "2" }), {
    inputTokens: 1,
  });
  assert.equal(readTokenUsage("nope"), undefined);
});

test("the router adapter returns the usage of a plain reply", async () => {
  const adapter = createRouterAdapter({
    baseUrl: "https://router.test/v1",
    model: "m",
    fetchImpl: async () =>
      Response.json({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 7, completion_tokens: 2 },
      }),
  });
  assert.deepEqual(await adapter.generateReply(request), {
    ok: true,
    provider: "router",
    text: "ok",
    usage: { inputTokens: 7, outputTokens: 2 },
  });
});

test("the anthropic adapter returns the usage of a plain reply", async () => {
  const adapter = createAnthropicAdapter({
    apiKey: "k",
    model: "claude-x",
    fetchImpl: async () =>
      Response.json({
        content: [{ text: "ok" }],
        usage: { input_tokens: 3, output_tokens: 5 },
      }),
  });
  assert.deepEqual(await adapter.generateReply(request), {
    ok: true,
    provider: "anthropic",
    text: "ok",
    usage: { inputTokens: 3, outputTokens: 5 },
  });
});

test("the local adapter returns the usage of a plain reply", async () => {
  const adapter = createLocalAdapter({
    baseUrl: "http://localhost:11434",
    model: "llama",
    fetchImpl: async () =>
      Response.json({
        message: { content: "ok" },
        prompt_eval_count: 11,
        eval_count: 4,
      }),
  });
  assert.deepEqual(await adapter.generateReply(request), {
    ok: true,
    provider: "local",
    text: "ok",
    usage: { inputTokens: 11, outputTokens: 4 },
  });
});

test("a plain reply without usage has no usage key at all", async () => {
  const router = createRouterAdapter({
    baseUrl: "https://router.test/v1",
    model: "m",
    fetchImpl: async () =>
      Response.json({ choices: [{ message: { content: "ok" } }] }),
  });
  const result = await router.generateReply(request);
  assert.equal(result.ok, true);
  assert.equal("usage" in result, false);
});

test("failover keeps the usage of the model that answered", async () => {
  const failing: ModelAdapter = {
    provider: "router",
    model: "a",
    async generateReply() {
      return { ok: false, code: "provider_rejected", provider: "router" };
    },
  };
  const answering: ModelAdapter = {
    provider: "router",
    model: "b",
    async generateReply() {
      return {
        ok: true,
        provider: "router",
        text: "second",
        usage: { inputTokens: 1, outputTokens: 2 },
      };
    },
  };
  const result = await executeWithFailover({
    request,
    primaryAdapter: failing,
    fallbackAdapter: answering,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.usage, { inputTokens: 1, outputTokens: 2 });
    assert.equal(result.failover?.toModel, "b");
  }
});
