import assert from "node:assert/strict";
import test from "node:test";

import { validateClientModelConfig } from "../model/model-config.ts";
import { firstRunCopy } from "./first-run-copy.ts";
import { START_FREE_CONFIG, firstRunStep } from "./first-run-state.ts";

const base = {
  isConfigured: false,
  startedFree: false,
  savedKeys: {},
  savedKeysLoaded: true,
  savedKeysFailed: false,
};
const openRouterKey = {
  router: {
    provider: "router" as const,
    origin: "https://openrouter.ai",
    updatedAt: 1,
  },
};

test("the free config is a valid OpenRouter router config", () => {
  assert.deepEqual(validateClientModelConfig(START_FREE_CONFIG), {
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/free",
  });
});

test("with no model the user chooses, key or no key", () => {
  assert.equal(firstRunStep(base), "choose");
  assert.equal(firstRunStep({ ...base, savedKeys: openRouterKey }), "choose");
});

test("a configured profile never sees the flow unless it just started free", () => {
  assert.equal(firstRunStep({ ...base, isConfigured: true }), "hidden");
});

test("started free with a saved OpenRouter key ends in the chat", () => {
  assert.equal(
    firstRunStep({
      ...base,
      isConfigured: true,
      startedFree: true,
      savedKeys: openRouterKey,
    }),
    "hidden",
  );
});

test("started free without a key says so instead of pretending", () => {
  assert.equal(
    firstRunStep({ ...base, isConfigured: true, startedFree: true }),
    "needs-key",
  );
});

test("a key saved for another origin does not count", () => {
  const other = {
    router: { ...openRouterKey.router, origin: "http://localhost:3000" },
  };
  assert.equal(
    firstRunStep({
      ...base,
      isConfigured: true,
      startedFree: true,
      savedKeys: other,
    }),
    "needs-key",
  );
});

test("while the key list is loading, the card says it is checking", () => {
  assert.equal(
    firstRunStep({
      ...base,
      isConfigured: true,
      startedFree: true,
      savedKeysLoaded: false,
    }),
    "checking",
  );
});

test("a failed key list is its own step, with a way to retry", () => {
  assert.equal(
    firstRunStep({
      ...base,
      isConfigured: true,
      startedFree: true,
      savedKeysLoaded: false,
      savedKeysFailed: true,
    }),
    "load-failed",
  );
});

test("a failed key list does not change the choice before a model exists", () => {
  assert.equal(
    firstRunStep({ ...base, savedKeysLoaded: false, savedKeysFailed: true }),
    "choose",
  );
});

test("every language has the same first-run copy keys", () => {
  const keys = Object.keys(firstRunCopy.pt).sort();
  for (const language of ["pt", "en", "es"] as const) {
    assert.deepEqual(Object.keys(firstRunCopy[language]).sort(), keys);
  }
});
