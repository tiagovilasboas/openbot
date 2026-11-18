import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isNearDuplicate, jaccard, tokenize } from "./text-similarity.ts";

describe("tokenize", () => {
  it("lowercases, strips accents and punctuation", () => {
    assert.deepEqual(tokenize("  Olá, MUNDO!! Já é 2026. "), [
      "ola",
      "mundo",
      "ja",
      "e",
      "2026",
    ]);
  });
  it("returns nothing for punctuation only", () => {
    assert.deepEqual(tokenize("?!... "), []);
  });
});

describe("jaccard", () => {
  it("is 1 for equal sets and 0 for disjoint or empty", () => {
    assert.equal(jaccard(["a", "b"], ["b", "a"]), 1);
    assert.equal(jaccard(["a"], ["b"]), 0);
    assert.equal(jaccard([], []), 0);
  });
  it("measures partial overlap", () => {
    assert.equal(jaccard(["a", "b", "c"], ["b", "c", "d"]), 0.5);
  });
});

describe("isNearDuplicate", () => {
  it("matches identical text after normalization", () => {
    assert.ok(isNearDuplicate("Ok, done!", "ok  DONE", 0.85));
  });
  it("uses exact match only for very short texts", () => {
    assert.ok(!isNearDuplicate("ok thanks", "ok thanks a lot", 0.5));
  });
  it("matches long texts above the threshold", () => {
    const a = "the plan has five steps and we start with the first one today";
    const b = "the plan has five steps and we start with the first one";
    assert.ok(isNearDuplicate(a, b, 0.85));
    assert.ok(
      !isNearDuplicate(
        a,
        "a completely different answer about pricing tiers",
        0.85,
      ),
    );
  });
  it("never matches empty normalized text", () => {
    assert.ok(!isNearDuplicate("...", "!!!", 0.5));
  });
});
