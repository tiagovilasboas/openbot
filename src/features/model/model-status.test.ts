import assert from "node:assert/strict";
import test from "node:test";

import { modelStatus } from "./model-status.ts";

const openRouter = {
  provider: "router" as const,
  baseUrl: "https://openrouter.ai/api/v1",
  model: "openrouter/free",
};

test("no model at all is unconfigured", () => {
  assert.equal(
    modelStatus({
      isConfigured: false,
      config: null,
      lastCallFailed: false,
      hasSavedKey: false,
    }),
    "unconfigured",
  );
});

test("OpenRouter without a key fails before any call", () => {
  assert.equal(
    modelStatus({
      isConfigured: true,
      config: openRouter,
      lastCallFailed: false,
      hasSavedKey: false,
    }),
    "failing",
  );
  assert.equal(
    modelStatus({
      isConfigured: true,
      config: openRouter,
      lastCallFailed: false,
      hasSavedKey: true,
    }),
    "ready",
  );
});

test("a failed last call turns a configured model to failing", () => {
  const local = {
    provider: "local" as const,
    baseUrl: "http://localhost:11434",
    model: "llama3",
  };
  assert.equal(
    modelStatus({
      isConfigured: true,
      config: local,
      lastCallFailed: true,
      hasSavedKey: false,
    }),
    "failing",
  );
  assert.equal(
    modelStatus({
      isConfigured: true,
      config: local,
      lastCallFailed: false,
      hasSavedKey: false,
    }),
    "ready",
  );
});
