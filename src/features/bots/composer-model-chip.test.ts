import assert from "node:assert/strict";
import test from "node:test";
import { composerModelChip } from "./composer-model-chip.ts";

test("a configured model shows its short name and opens the picker", () => {
  const chip = composerModelChip(true, "vendor/picked:free", "pt");
  assert.equal(chip.text, "picked:free");
  assert.equal(chip.title, "vendor/picked:free");
  assert.equal(chip.action, "pick");
  assert.match(chip.ariaLabel, /vendor\/picked:free/);
});

test("the pending next label stays visible in the chip", () => {
  const chip = composerModelChip(true, "próximo: vendor/x:free", "pt");
  assert.equal(chip.text, "próximo: x:free");
  assert.match(chip.ariaLabel, /próximo: vendor\/x:free/);
});

test("without a model the chip says connect and opens settings", () => {
  assert.deepEqual(composerModelChip(false, "ignored", "en"), {
    text: "Connect",
    ariaLabel: "Connect a model",
    title: "Connect a model",
    action: "connect",
  });
});
