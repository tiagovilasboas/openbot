import assert from "node:assert/strict";
import test from "node:test";
import { calculateContextBudget } from "./calculate-context-budget.ts";
import { contextUsageLabel } from "./context-window-copy.ts";
import {
  contextWindowFor,
  DEFAULT_CONTEXT_WINDOW_TOKENS,
} from "./model-context-window.ts";

const user = (text: string) => ({ role: "user" as const, text });

test("an empty thread uses no context", () => {
  const b = calculateContextBudget([], "openrouter/free");
  assert.equal(b.totalEstimatedTokens, 0);
  assert.equal(b.usageRatio, 0);
  assert.equal(b.maxWindowTokens, 262_144);
  assert.equal(b.isCompactionRecommended, false);
});

test("an unknown model gets the conservative default window", () => {
  assert.equal(contextWindowFor("acme/mystery"), DEFAULT_CONTEXT_WINDOW_TOKENS);
  assert.equal(contextWindowFor(undefined), DEFAULT_CONTEXT_WINDOW_TOKENS);
  const b = calculateContextBudget([user("a".repeat(400))], "acme/mystery");
  assert.equal(b.totalEstimatedTokens, 100);
  assert.equal(b.maxWindowTokens, 32_768);
});

test("counts the system prompt and attachment bytes with chars/4", () => {
  const b = calculateContextBudget([user("abcd")], "x", {
    systemPrompt: "a".repeat(8),
    attachmentBytes: 12,
  });
  assert.equal(b.totalEstimatedTokens, 6);
});

test("counts only the messages the request would send", () => {
  const many = Array.from({ length: 100 }, () => user("a".repeat(4)));
  assert.equal(calculateContextBudget(many, "x").totalEstimatedTokens, 40);
});

test("a very long message caps the ratio at 1", () => {
  const b = calculateContextBudget([user("a".repeat(1_000_000))], "x");
  assert.equal(b.usageRatio, 1);
  assert.equal(b.isCompactionRecommended, true);
});

test("compaction is recommended from 75% of the window", () => {
  const window = 32_768;
  const at = (tokens: number) =>
    calculateContextBudget([user("a".repeat(tokens * 4))], "x");
  assert.equal(at(window * 0.75 - 1).isCompactionRecommended, false);
  assert.equal(at(window * 0.75).isCompactionRecommended, true);
});

test("the label says the percentage in every language and warns in words", () => {
  const low = calculateContextBudget([user("a".repeat(4 * 3_277))], "x");
  assert.equal(contextUsageLabel(low, "pt").text, "10% do contexto");
  assert.equal(contextUsageLabel(low, "en").text, "10% of context");
  assert.equal(contextUsageLabel(low, "es").text, "10% del contexto");
  assert.equal(contextUsageLabel(low, "en").isWarning, false);
  const high = calculateContextBudget([user("a".repeat(4 * 30_000))], "x");
  const label = contextUsageLabel(high, "en");
  assert.equal(label.isWarning, true);
  assert.match(label.text, /nearly full/);
});
