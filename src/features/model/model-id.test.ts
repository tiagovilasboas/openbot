import assert from "node:assert/strict";
import test from "node:test";
import { createAnthropicAdapter } from "./anthropic-adapter.ts";
import { isModelAllowed, readAllowedModels } from "./allowed-models.ts";
import { executeWithFailover } from "./failover-runner.ts";
import { createLocalAdapter } from "./local-adapter.ts";
import type { ModelAdapter, ModelRequest } from "./model-adapter.ts";
import {
  MODEL_ID_MAX_LENGTH,
  parseModelId,
  sanitizeModelId,
} from "./model-id.ts";
import { parseChatRequest } from "./parse-chat-request.ts";
import { createRouterAdapter } from "./router-adapter.ts";

const base = {
  language: "en" as const,
  messages: [{ role: "user" as const, text: "hi" }],
};

test("sanitizeModelId trims and keeps plain provider ids", () => {
  assert.equal(
    sanitizeModelId("  vendor/model-a:free "),
    "vendor/model-a:free",
  );
  assert.equal(sanitizeModelId("claude-3.5_sonnet"), "claude-3.5_sonnet");
});

test("sanitizeModelId drops blank, odd or too long ids", () => {
  for (const raw of [
    undefined,
    null,
    "",
    "   ",
    42,
    {},
    "has space",
    "semi;colon",
    "quote'",
    "new\nline",
    "ação",
    "a".repeat(MODEL_ID_MAX_LENGTH + 1),
  ]) {
    assert.equal(sanitizeModelId(raw), undefined, JSON.stringify(raw));
  }
  const longest = "a".repeat(MODEL_ID_MAX_LENGTH);
  assert.equal(sanitizeModelId(longest), longest);
});

test("parseModelId separates absent from invalid", () => {
  assert.deepEqual(parseModelId(undefined), { ok: true });
  assert.deepEqual(parseModelId("  "), { ok: true });
  assert.deepEqual(parseModelId("a/b"), { ok: true, modelId: "a/b" });
  assert.deepEqual(parseModelId("a b"), { ok: false });
  assert.deepEqual(parseModelId(7), { ok: false });
});

test("parseChatRequest carries a valid modelId and omits it when absent", () => {
  const withId = parseChatRequest({ ...base, modelId: " vendor/m:free " });
  assert.ok(withId.ok);
  assert.equal(withId.request.modelId, "vendor/m:free");

  for (const payload of [base, { ...base, modelId: "" }]) {
    const parsed = parseChatRequest(payload);
    assert.ok(parsed.ok);
    assert.ok(!("modelId" in parsed.request));
  }
});

test("parseChatRequest rejects a malformed modelId", () => {
  for (const modelId of ["bad id", 5, "x".repeat(101), "a;b", ["a"]]) {
    assert.equal(parseChatRequest({ ...base, modelId }).ok, false);
  }
});

test("the allow-list is off when the env is unset, empty or only commas", () => {
  for (const value of [undefined, "", " , ,"]) {
    const env = { OPENBOT_ALLOWED_MODELS: value };
    assert.equal(readAllowedModels(env), null);
    assert.equal(isModelAllowed(env, "any/well-formed:id"), true);
  }
});

test("the allow-list admits only the listed ids", () => {
  const env = { OPENBOT_ALLOWED_MODELS: " vendor/a , vendor/b:free,," };
  assert.deepEqual([...readAllowedModels(env)!], ["vendor/a", "vendor/b:free"]);
  assert.equal(isModelAllowed(env, "vendor/a"), true);
  assert.equal(isModelAllowed(env, "vendor/b:free"), true);
  assert.equal(isModelAllowed(env, "vendor/c"), false);
  assert.equal(isModelAllowed(env, "VENDOR/A"), false);
});

function captureFetch(sent: Array<{ model?: string }>): typeof fetch {
  return (async (_url: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    return Response.json({
      choices: [{ message: { content: "ok" } }],
      message: { content: "ok" },
      content: [{ type: "text", text: "ok" }],
    });
  }) as typeof fetch;
}

test("each adapter sends the call's modelId instead of the configured model", async () => {
  const sent: Array<{ model?: string }> = [];
  const fetchImpl = captureFetch(sent);
  const adapters: ModelAdapter[] = [
    createRouterAdapter({
      baseUrl: "https://router.test/v1",
      model: "configured",
      fetchImpl,
    }),
    createLocalAdapter({
      baseUrl: "http://localhost:11434",
      model: "configured",
      fetchImpl,
    }),
    createAnthropicAdapter({ apiKey: "k", model: "configured", fetchImpl }),
  ];
  for (const adapter of adapters) {
    await adapter.generateReply({ ...base, modelId: "bot/own-model" });
    await adapter.generateReply(base);
  }
  assert.deepEqual(
    sent.map((body) => body.model),
    [
      "bot/own-model",
      "configured",
      "bot/own-model",
      "configured",
      "bot/own-model",
      "configured",
    ],
  );
});

test("a failed per-call model falls back without reusing its modelId", async () => {
  const seen: Array<string | undefined> = [];
  const failing: ModelAdapter = {
    provider: "router",
    model: "configured",
    async generateReply(request: ModelRequest) {
      seen.push(request.modelId);
      return {
        ok: false,
        code: "provider_rejected",
        provider: "router",
        detail: "429",
      };
    },
  };
  const fallback: ModelAdapter = {
    provider: "router",
    model: "fallback-model",
    async generateReply(request: ModelRequest) {
      seen.push(request.modelId);
      return { ok: true, provider: "router", text: "from fallback" };
    },
  };

  const result = await executeWithFailover({
    request: { ...base, modelId: "bot/own-model" },
    primaryAdapter: failing,
    fallbackAdapter: fallback,
  });

  assert.deepEqual(seen, ["bot/own-model", undefined]);
  assert.ok(result.ok);
  assert.equal(result.failover?.fromModel, "bot/own-model");
  assert.equal(result.failover?.toModel, "fallback-model");
});
