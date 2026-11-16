import assert from "node:assert/strict";
import test from "node:test";
import { botModelBadge } from "./bot-model-badge.ts";

test("a bot without its own model keeps the global label", () => {
  assert.equal(
    botModelBadge("Router: openrouter/free", "router", undefined, "pt"),
    "Router: openrouter/free",
  );
  assert.equal(
    botModelBadge("Router: openrouter/free", "router", "  ", "pt"),
    "Router: openrouter/free",
  );
});

test("the bot's model is shown under the active provider", () => {
  assert.equal(
    botModelBadge("Router: openrouter/free", "router", "vendor/m:free", "en"),
    "Router: vendor/m:free",
  );
});

test("without a known provider the bare model id is shown", () => {
  assert.equal(
    botModelBadge("No model", undefined, "vendor/m:free", "pt"),
    "vendor/m:free",
  );
});
