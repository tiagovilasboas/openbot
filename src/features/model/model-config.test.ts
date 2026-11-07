import assert from "node:assert/strict";
import test from "node:test";
import { formatModelBadge, validateClientModelConfig } from "./model-config.ts";

test("validates router configuration correctly", () => {
  const valid = validateClientModelConfig({
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    apiKey: "sk-or-test",
  });
  assert.deepEqual(valid, {
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    apiKey: "sk-or-test",
  });

  const withoutKey = validateClientModelConfig({
    provider: "router",
    baseUrl: "http://localhost:20128/v1",
    model: "o3-mini",
  });
  assert.deepEqual(withoutKey, {
    provider: "router",
    baseUrl: "http://localhost:20128/v1",
    model: "o3-mini",
  });

  assert.equal(
    validateClientModelConfig({
      provider: "router",
      baseUrl: "not-a-url",
      model: "o3-mini",
    }),
    null,
  );
  assert.equal(
    validateClientModelConfig({
      provider: "router",
      baseUrl: "http://localhost:20128/v1",
      model: "   ",
    }),
    null,
  );
});

test("validates local configuration correctly", () => {
  const valid = validateClientModelConfig({
    provider: "local",
    baseUrl: "http://localhost:11434",
    model: "llama3",
  });
  assert.deepEqual(valid, {
    provider: "local",
    baseUrl: "http://localhost:11434",
    model: "llama3",
  });

  assert.equal(
    validateClientModelConfig({
      provider: "local",
      baseUrl: "ftp://localhost:11434",
      model: "llama3",
    }),
    null,
  );
  assert.equal(
    validateClientModelConfig({
      provider: "local",
      baseUrl: "http://localhost:11434",
      model: "",
    }),
    null,
  );
});

test("validates anthropic configuration correctly", () => {
  const valid = validateClientModelConfig({
    provider: "anthropic",
    apiKey: "sk-ant-test-key",
    model: "claude-3-5-sonnet-20241022",
  });
  assert.deepEqual(valid, {
    provider: "anthropic",
    apiKey: "sk-ant-test-key",
    model: "claude-3-5-sonnet-20241022",
  });

  assert.equal(
    validateClientModelConfig({
      provider: "anthropic",
      apiKey: "   ",
      model: "claude-3-5-sonnet",
    }),
    null,
  );
  assert.equal(
    validateClientModelConfig({
      provider: "anthropic",
      apiKey: "sk-ant-key",
      model: "",
    }),
    null,
  );
});

test("rejects malformed or unknown provider inputs", () => {
  assert.equal(validateClientModelConfig(null), null);
  assert.equal(validateClientModelConfig(undefined), null);
  assert.equal(validateClientModelConfig("string"), null);
  assert.equal(validateClientModelConfig({ provider: "unknown" }), null);
});

test("formatModelBadge formats label for providers and demo mode", () => {
  assert.equal(
    formatModelBadge({ provider: "router", model: "o3-mini" }, false, "pt"),
    "Router: o3-mini",
  );
  assert.equal(
    formatModelBadge({ provider: "local", model: "llama3" }, false, "pt"),
    "Local: llama3",
  );
  assert.equal(
    formatModelBadge(
      { provider: "anthropic", model: "claude-3-5-sonnet" },
      false,
      "en",
    ),
    "Anthropic: claude-3-5-sonnet",
  );
  assert.equal(formatModelBadge(null, true, "pt"), "Modo Demo");
  assert.equal(formatModelBadge(null, true, "en"), "Demo Mode");
  assert.equal(formatModelBadge(null, false, "pt"), "Modo Demo");
});

test("validates all OpenRouter free tier models and presets", () => {
  const models = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free",
    "google/gemini-2.0-flash-exp:free",
    "qwen/qwen-2.5-coder-32b-instruct:free",
  ];

  for (const model of models) {
    const config = validateClientModelConfig({
      provider: "router",
      baseUrl: "https://openrouter.ai/api/v1",
      model,
      apiKey: "sk-or-v1-fakekey",
    });
    assert.ok(config);
    assert.equal(config.model, model);
  }

  const ollama = validateClientModelConfig({
    provider: "local",
    baseUrl: "http://localhost:11434",
    model: "llama3.2",
  });
  assert.ok(ollama);
  assert.equal(ollama.model, "llama3.2");
});
