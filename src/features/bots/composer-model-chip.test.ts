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

test("the provider prefix leaves the visible text but not the tooltip", () => {
  const chip = composerModelChip(true, "Router: vendor/picked:free", "en");
  assert.equal(chip.text, "picked:free");
  assert.equal(chip.title, "Router: vendor/picked:free");
  assert.match(chip.ariaLabel, /Router: vendor\/picked:free/);
  const next = composerModelChip(true, "next: Local: llama3", "en");
  assert.equal(next.text, "next: llama3");
});

test("without a model the chip says connect and opens settings", () => {
  assert.deepEqual(composerModelChip(false, "ignored", "en"), {
    text: "Connect",
    ariaLabel: "Connect a model",
    title: "Connect a model",
    action: "connect",
    tone: "default",
  });
});

test("a usable model keeps the default tone", () => {
  const chip = composerModelChip(true, "vendor/x:free", "en", {
    usable: true,
  });
  assert.equal(chip.tone, "default");
  assert.equal(chip.title, "vendor/x:free");
});

test("a model of a switched-off provider warns and still opens the picker", () => {
  const off = { usable: false, provider: "router" } as const;
  const en = composerModelChip(true, "vendor/x:free", "en", off);
  assert.equal(en.tone, "warning");
  assert.equal(en.action, "pick");
  assert.equal(en.text, "x:free");
  assert.match(en.title, /OpenRouter is switched off/);
  assert.match(en.ariaLabel, /vendor\/x:free.*OpenRouter is switched off/);
  const pt = composerModelChip(true, "vendor/x:free", "pt", off);
  assert.match(pt.title, /OpenRouter está desativado/);
  assert.match(pt.ariaLabel, /escolher outro modelo/);
  const es = composerModelChip(true, "claude-x", "es", {
    usable: false,
    provider: "anthropic",
  });
  assert.match(es.title, /Anthropic está desactivado/);
});

test("without a model the warning does not apply", () => {
  const chip = composerModelChip(false, "x", "en", {
    usable: false,
    provider: "router",
  });
  assert.equal(chip.tone, "default");
  assert.equal(chip.action, "connect");
});
