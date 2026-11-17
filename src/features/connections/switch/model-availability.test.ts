import assert from "node:assert/strict";
import test from "node:test";
import {
  connectionForModelId,
  connectionForProviderType,
  modelUsability,
  providerTypeUsability,
} from "./model-availability.ts";

test("provider types and model ids map to a connection", () => {
  assert.equal(connectionForProviderType("router"), "router");
  assert.equal(connectionForProviderType("anthropic"), "anthropic");
  assert.equal(connectionForProviderType("local"), null);
  assert.equal(connectionForModelId("google/gemma-4-31b-it:free"), "router");
  assert.equal(connectionForModelId("claude-sonnet-5"), "anthropic");
  assert.equal(connectionForModelId("llama3"), null);
  assert.equal(connectionForModelId(undefined), null);
  assert.equal(connectionForModelId("  "), null);
});

test("a switched-off provider makes its models and type unusable", () => {
  assert.deepEqual(modelUsability("openrouter/free", ["router"]), {
    usable: false,
    provider: "router",
  });
  assert.deepEqual(providerTypeUsability("anthropic", ["router"]), {
    usable: true,
  });
  assert.deepEqual(providerTypeUsability("anthropic", ["anthropic"]), {
    usable: false,
    provider: "anthropic",
  });
});

test("local servers, unknown ids and an empty off list stay usable", () => {
  assert.deepEqual(providerTypeUsability("local", ["router", "anthropic"]), {
    usable: true,
  });
  assert.deepEqual(modelUsability("llama3", ["router"]), { usable: true });
  assert.deepEqual(modelUsability("openrouter/free", []), { usable: true });
});
