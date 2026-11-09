import assert from "node:assert/strict";
import test from "node:test";

import { lacksRequiredRouterKey, routerNeedsApiKey } from "./router-key.ts";

test("only OpenRouter hosts require a router key", () => {
  assert.equal(routerNeedsApiKey("https://openrouter.ai/api/v1"), true);
  assert.equal(routerNeedsApiKey("https://eu.openrouter.ai/api/v1"), true);
  assert.equal(routerNeedsApiKey("http://localhost:20128/v1"), false);
  assert.equal(routerNeedsApiKey("https://openrouter.ai.evil.test/v1"), false);
  assert.equal(routerNeedsApiKey("not a url"), false);
});

test("an OpenRouter config without a usable key lacks the required key", () => {
  const url = "https://openrouter.ai/api/v1";
  assert.equal(lacksRequiredRouterKey(url, undefined), true);
  assert.equal(lacksRequiredRouterKey(url, "   "), true);
  assert.equal(lacksRequiredRouterKey(url, "sk-or-v1-test"), false);
  assert.equal(lacksRequiredRouterKey("http://localhost:20128/v1", ""), false);
});
