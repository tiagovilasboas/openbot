import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTIONS, findConnection } from "./connection-catalog.ts";
import { configAfterConnect, testConfigFor } from "./manage-connection.ts";

test("a first OpenRouter key starts the chat on the free router", () => {
  assert.deepEqual(configAfterConnect("router", " sk-or-1 ", null), {
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/free",
    apiKey: "sk-or-1",
  });
  assert.equal(configAfterConnect("anthropic", "sk-ant-1", null), null);
});

test("a key for the active provider replaces its key, others leave it", () => {
  const active = {
    provider: "router" as const,
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemma-4-31b-it:free",
    apiKey: "old",
  };
  assert.deepEqual(configAfterConnect("router", "new", active), {
    ...active,
    apiKey: "new",
  });
  assert.equal(configAfterConnect("anthropic", "sk-ant-1", active), null);
});

test("an OpenRouter key is tried on the active OpenRouter model", () => {
  const config = testConfigFor("router", "sk-or-1", {
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemma-4-31b-it:free",
  });
  assert.deepEqual(config, {
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemma-4-31b-it:free",
    apiKey: "sk-or-1",
  });
});

test("an OpenRouter key falls back to the free router off OpenRouter", () => {
  const config = testConfigFor("router", "sk-or-1", {
    provider: "router",
    baseUrl: "http://localhost:20128/v1",
    model: "o3-mini",
  });
  assert.deepEqual(config, {
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/free",
    apiKey: "sk-or-1",
  });
});

test("an Anthropic key keeps the active Anthropic model", () => {
  assert.deepEqual(
    testConfigFor("anthropic", "sk-ant-1", {
      provider: "anthropic",
      apiKey: "old",
      model: "claude-sonnet-5-5",
    }),
    { provider: "anthropic", apiKey: "sk-ant-1", model: "claude-sonnet-5-5" },
  );
  assert.equal(
    testConfigFor("anthropic", "sk-ant-1", null).provider,
    "anthropic",
  );
});

test("every connection has a key link on https", () => {
  for (const entry of CONNECTIONS) {
    assert.ok(entry.keyUrl.startsWith("https://"), entry.id);
    assert.equal(findConnection(entry.id), entry);
  }
});
