import assert from "node:assert/strict";
import test from "node:test";
import { buildModelChoices, readCustomModelId } from "./bot-model-options.ts";

const FREE = [
  { id: "openrouter/free", name: "Auto Free Router" },
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 (free)" },
];

test("the default row comes first and is current when the bot has no model", () => {
  const rows = buildModelChoices(FREE, undefined, "Padrão");
  assert.equal(rows[0].isDefault, true);
  assert.equal(rows[0].isCurrent, true);
  assert.equal(rows[0].id, "");
  assert.deepEqual(
    rows.slice(1).map((r) => r.isCurrent),
    [false, false],
  );
});

test("a listed model is marked current and the default is not", () => {
  const rows = buildModelChoices(FREE, "openrouter/free", "Padrão");
  assert.equal(rows[0].isCurrent, false);
  assert.equal(rows.filter((r) => r.isCurrent).length, 1);
  assert.equal(rows.find((r) => r.isCurrent)?.id, "openrouter/free");
});

test("a hand-typed model outside the list is kept and marked", () => {
  const rows = buildModelChoices(FREE, "vendor/own:free", "Padrão");
  assert.equal(rows[1].id, "vendor/own:free");
  assert.equal(rows[1].isCurrent, true);
  assert.equal(rows.length, 4);
});

test("display names lose the free decoration", () => {
  const rows = buildModelChoices(FREE, undefined, "Padrão");
  assert.equal(rows[2].name, "Gemma 4");
});

test("custom ids follow the edit form rule", () => {
  assert.deepEqual(readCustomModelId("  vendor/m:free "), {
    ok: true,
    modelId: "vendor/m:free",
  });
  assert.deepEqual(readCustomModelId("   "), { ok: false, reason: "empty" });
  assert.deepEqual(readCustomModelId("not a model"), {
    ok: false,
    reason: "invalid",
  });
});
