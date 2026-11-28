import assert from "node:assert/strict";
import test from "node:test";
import type { ClientModelConfig } from "../../model/model-config.ts";
import {
  configAfterConnect,
  shouldClearConfigOnDisconnect,
} from "./model-config-on-connection.ts";

const freeRouter: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "openrouter/free",
};
const anthropic: ClientModelConfig = {
  provider: "anthropic",
  model: "claude-haiku-5-5",
};
const local: ClientModelConfig = {
  provider: "local",
  baseUrl: "http://localhost:11434/v1",
  model: "llama",
};

test("a first OpenRouter connection starts on the free router, keyless", () => {
  assert.deepEqual(configAfterConnect("router", null), freeRouter);
});

test("a first Anthropic connection starts on the current Anthropic model", () => {
  assert.deepEqual(configAfterConnect("anthropic", null), anthropic);
});

test("a choice on the connected provider is never overwritten", () => {
  const chosen = { ...freeRouter, model: "google/gemma-4-31b-it:free" };
  assert.equal(configAfterConnect("router", chosen), null);
  assert.equal(configAfterConnect("anthropic", anthropic), null);
});

test("a config on another provider with no key is replaced", () => {
  assert.deepEqual(configAfterConnect("router", anthropic, []), freeRouter);
  assert.deepEqual(configAfterConnect("anthropic", freeRouter, []), anthropic);
});

test("a config on another provider that has a key is kept", () => {
  assert.equal(configAfterConnect("router", anthropic, ["anthropic"]), null);
  assert.equal(configAfterConnect("anthropic", freeRouter, ["router"]), null);
});

test("local servers and custom routers are kept", () => {
  const custom: ClientModelConfig = {
    provider: "router",
    baseUrl: "http://localhost:20128/v1",
    model: "o3-mini",
  };
  assert.equal(configAfterConnect("router", local, []), null);
  assert.equal(configAfterConnect("anthropic", custom, []), null);
});

test("disconnect clears the config that used the forgotten key", () => {
  assert.equal(shouldClearConfigOnDisconnect("router", freeRouter), true);
  assert.equal(shouldClearConfigOnDisconnect("anthropic", anthropic), true);
});

test("disconnect keeps configs that never used that key", () => {
  assert.equal(shouldClearConfigOnDisconnect("router", anthropic), false);
  assert.equal(shouldClearConfigOnDisconnect("anthropic", freeRouter), false);
  assert.equal(shouldClearConfigOnDisconnect("router", local), false);
  assert.equal(shouldClearConfigOnDisconnect("github", freeRouter), false);
  assert.equal(shouldClearConfigOnDisconnect("router", null), false);
});

test("a first ChatGPT connection starts on the default ChatGPT model", () => {
  assert.deepEqual(configAfterConnect("chatgpt", null), {
    provider: "chatgpt",
    model: "gpt-4o",
  });
  assert.equal(
    shouldClearConfigOnDisconnect("chatgpt", {
      provider: "chatgpt",
      model: "gpt-4o",
    }),
    true,
  );
});

test("a router on a lookalike host is not cleared as OpenRouter", () => {
  const lookalike: ClientModelConfig = {
    provider: "router",
    baseUrl: "https://openrouter.ai.example.net/v1",
    model: "m",
  };
  assert.equal(shouldClearConfigOnDisconnect("router", lookalike), false);
  assert.equal(configAfterConnect("anthropic", lookalike), null);
});
