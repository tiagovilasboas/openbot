import assert from "node:assert/strict";
import test from "node:test";
import {
  MODEL_CONFIG_STORAGE_KEY,
  loadStoredModelConfig,
  saveStoredModelConfig,
  validateClientModelConfig,
  withoutApiKey,
} from "./model-config.ts";

test("an Anthropic config needs no key of its own", () => {
  assert.deepEqual(
    validateClientModelConfig({ provider: "anthropic", model: "claude" }),
    { provider: "anthropic", model: "claude" },
  );
  assert.equal(
    validateClientModelConfig({
      provider: "anthropic",
      model: "claude",
      apiKey: "x".repeat(501),
    }),
    null,
  );
});

test("withoutApiKey drops the key and leaves the rest", () => {
  assert.deepEqual(
    withoutApiKey({
      provider: "router",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "m",
      apiKey: "sk",
    }),
    { provider: "router", baseUrl: "https://openrouter.ai/api/v1", model: "m" },
  );
});

test("the stored config never carries a key, saved or loaded", () => {
  const map = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
  const holder = globalThis as unknown as { window?: unknown };
  holder.window = { localStorage, addEventListener() {} };
  try {
    saveStoredModelConfig({
      provider: "router",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "m",
      apiKey: "sk-or-secret",
    });
    assert.equal(map.get(MODEL_CONFIG_STORAGE_KEY)?.includes("secret"), false);

    // An older version's config with a key loads without it.
    map.set(
      MODEL_CONFIG_STORAGE_KEY,
      JSON.stringify({ provider: "anthropic", apiKey: "sk-ant", model: "c" }),
    );
    assert.deepEqual(loadStoredModelConfig(), {
      provider: "anthropic",
      model: "c",
    });
  } finally {
    delete holder.window;
  }
});
