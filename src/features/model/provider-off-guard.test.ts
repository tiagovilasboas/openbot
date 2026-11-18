import assert from "node:assert/strict";
import test from "node:test";
import type { ClientModelConfig } from "./model-config.ts";
import { noOffProviders, providerOffResponse } from "./provider-off-guard.ts";

const router: ClientModelConfig = {
  provider: "router",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "vendor/model",
};
const anthropic: ClientModelConfig = {
  provider: "anthropic",
  model: "claude-x",
};
const local: ClientModelConfig = {
  provider: "local",
  baseUrl: "http://localhost:11434",
  model: "llama3",
};

test("a request on a switched-off provider gets 409 provider_off", async () => {
  const response = providerOffResponse({ config: router }, () => ["router"]);
  assert.equal(response?.status, 409);
  assert.deepEqual(await response?.json(), {
    error: "provider_off",
    provider: "router",
  });
});

test("a fallback on a switched-off provider is refused too", async () => {
  const response = providerOffResponse(
    { config: router, fallbackConfig: anthropic },
    () => ["anthropic"],
  );
  assert.deepEqual(await response?.json(), {
    error: "provider_off",
    provider: "anthropic",
  });
});

test("providers left on, local models and the server's env provider pass", () => {
  assert.equal(providerOffResponse({ config: router }, noOffProviders), null);
  assert.equal(
    providerOffResponse({ config: anthropic }, () => ["router"]),
    null,
  );
  assert.equal(
    providerOffResponse({ config: local }, () => ["router", "anthropic"]),
    null,
  );
  assert.equal(
    providerOffResponse({}, () => ["router"]),
    null,
  );
});

test("the off list is not read when no config names a provider", () => {
  let reads = 0;
  providerOffResponse({ config: local }, () => {
    reads += 1;
    return [];
  });
  assert.equal(reads, 0);
});

test("the refusal never carries a key", async () => {
  const response = providerOffResponse(
    { config: { ...router, apiKey: "sk-secret-value" } },
    () => ["router"],
  );
  assert.ok(response);
  assert.doesNotMatch(await response.text(), /sk-secret-value/);
});
