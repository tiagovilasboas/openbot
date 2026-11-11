import assert from "node:assert/strict";
import test from "node:test";
import { executeWithFailover } from "./failover-runner.ts";
import { logFailover } from "./failover-log.ts";
import type { ModelAdapter, ModelRequest } from "./model-adapter.ts";
import { createRouterAdapter } from "./router-adapter.ts";

const PROMPT = "segredo do usuário";
const request: ModelRequest = {
  language: "pt",
  messages: [{ role: "user", text: PROMPT }],
};

function routerReplying(message: Record<string, unknown>) {
  return createRouterAdapter({
    baseUrl: "https://router.test/v1",
    model: "vendor/primary:free",
    apiKey: "sk-test-not-real",
    fetchImpl: async () =>
      Response.json({ choices: [{ message, finish_reason: "stop" }] }),
  });
}

test("a 200 with no content says empty_content", async () => {
  const result = await routerReplying({ content: null }).generateReply(request);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.detail, "200: empty_content");
});

test("a 200 with text only in reasoning says so", async () => {
  const result = await routerReplying({
    content: "",
    reasoning: "thinking out loud",
  }).generateReply(request);
  assert.equal(
    !result.ok && result.detail,
    "200: empty_content_reasoning_only",
  );
});

test("logFailover writes one line with models and reason only", () => {
  const lines: unknown[][] = [];
  logFailover(
    { fromModel: "a", toModel: "b", reason: "429: rate" },
    (...args) => lines.push(args),
  );
  assert.deepEqual(lines, [
    ["model.failover", { fromModel: "a", toModel: "b", reason: "429: rate" }],
  ]);
});

test("a failover is logged on the server without the key or the prompt", async () => {
  const fallback: ModelAdapter = {
    provider: "router",
    model: "openrouter/free",
    async generateReply() {
      return { ok: true, provider: "router", text: "fallback answer" };
    },
  };
  const warned: unknown[][] = [];
  const realWarn = console.warn;
  console.warn = (...args: unknown[]) => warned.push(args);
  try {
    const result = await executeWithFailover({
      request,
      primaryAdapter: routerReplying({ content: null }),
      fallbackAdapter: fallback,
    });
    assert.equal(result.ok && result.failover?.reason, "200: empty_content");
  } finally {
    console.warn = realWarn;
  }
  assert.equal(warned.length, 1);
  const line = JSON.stringify(warned[0]);
  assert.match(line, /model\.failover/);
  assert.match(line, /vendor\/primary:free/);
  assert.doesNotMatch(line, /sk-test-not-real/);
  assert.doesNotMatch(line, new RegExp(PROMPT));
});
