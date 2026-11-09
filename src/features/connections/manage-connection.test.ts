import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTIONS, findConnection } from "./connection-catalog.ts";
import { testConfigFor } from "./manage-connection.ts";

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
