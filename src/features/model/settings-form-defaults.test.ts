import assert from "node:assert/strict";
import { test } from "node:test";
import { SETTINGS_FORM_DEFAULTS } from "./settings-form-defaults.ts";
import { ANTHROPIC_DEFAULT_MODEL } from "../connections/copy.ts";

test("the form defaults Anthropic to the model a fresh connection selects", () => {
  assert.equal(SETTINGS_FORM_DEFAULTS.anthropicModel, ANTHROPIC_DEFAULT_MODEL);
  assert.doesNotMatch(SETTINGS_FORM_DEFAULTS.anthropicModel, /claude-3/);
});

test("the form defaults the router to the OpenRouter free preset", () => {
  assert.equal(
    SETTINGS_FORM_DEFAULTS.routerUrl,
    "https://openrouter.ai/api/v1",
  );
  assert.equal(SETTINGS_FORM_DEFAULTS.routerModel, "openrouter/free");
});
