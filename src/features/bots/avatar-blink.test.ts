import assert from "node:assert/strict";
import test from "node:test";

import { blinkDelay } from "./avatar-blink.ts";

test("blinkDelay is deterministic and within one blink period", () => {
  assert.equal(blinkDelay("hexagon-teal"), blinkDelay("hexagon-teal"));
  assert.notEqual(blinkDelay("hexagon-teal"), blinkDelay("square-blue"));
  for (const seed of ["", "a", "egg-pink", "cloud-gold"]) {
    const d = blinkDelay(seed);
    assert.ok(d <= 0 && d > -5.5, seed);
  }
});
