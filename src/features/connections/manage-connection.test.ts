import assert from "node:assert/strict";
import test from "node:test";
import { CONNECTIONS, findConnection } from "./connection-catalog.ts";
import {
  configAfterConnect,
  saveKeyToVault,
  testConfigFor,
} from "./manage-connection.ts";

test("a first OpenRouter key starts the chat on the free router, keyless", () => {
  assert.deepEqual(configAfterConnect("router", null), {
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/free",
  });
  assert.equal(configAfterConnect("anthropic", null), null);
});

test("a key never rewrites the active model config", () => {
  const active = {
    provider: "router" as const,
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemma-4-31b-it:free",
  };
  assert.equal(configAfterConnect("router", active), null);
  assert.equal(configAfterConnect("anthropic", active), null);
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
      model: "claude-sonnet-5-5",
    }),
    { provider: "anthropic", apiKey: "sk-ant-1", model: "claude-sonnet-5-5" },
  );
  assert.equal(
    testConfigFor("anthropic", "sk-ant-1", null).provider,
    "anthropic",
  );
});

test("saving puts the trimmed key under the origin it was tested against", async () => {
  const calls: unknown[] = [];
  const saved = await saveKeyToVault(
    "router",
    " sk-or-1 ",
    { provider: "router", baseUrl: "http://localhost:20128/v1", model: "m" },
    async (input) => {
      calls.push(input);
      return true;
    },
  );
  assert.equal(saved, true);
  assert.deepEqual(calls, [
    { provider: "router", origin: "https://openrouter.ai", key: "sk-or-1" },
  ]);

  await saveKeyToVault("anthropic", "sk-ant-1", null, async (input) => {
    calls.push(input);
    return true;
  });
  assert.deepEqual(calls[1], {
    provider: "anthropic",
    origin: "https://api.anthropic.com",
    key: "sk-ant-1",
  });
});

test("a key the server did not save reports false", async () => {
  assert.equal(
    await saveKeyToVault("router", "sk", null, async () => false),
    false,
  );
});

test("every connection has a key link on https", () => {
  for (const entry of CONNECTIONS) {
    assert.ok(entry.keyUrl.startsWith("https://"), entry.id);
    assert.equal(findConnection(entry.id), entry);
  }
});
