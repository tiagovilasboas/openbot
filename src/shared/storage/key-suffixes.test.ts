import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keySuffixes } from "./key-suffixes.ts";

const listing = (keys: string[]) => ({
  length: keys.length,
  key: (i: number) => keys[i] ?? null,
});

describe("keySuffixes", () => {
  it("returns the part after the prefix, skipping other keys", () => {
    const s = listing(["p_a", "other", "p_b", "p_"]);
    assert.deepEqual(keySuffixes(s, "p_"), ["a", "b"]);
  });
  it("returns nothing without storage or when it throws", () => {
    assert.deepEqual(keySuffixes(undefined, "p_"), []);
    const broken = {
      length: 1,
      key: () => {
        throw new Error("blocked");
      },
    };
    assert.deepEqual(keySuffixes(broken, "p_"), []);
  });
});
