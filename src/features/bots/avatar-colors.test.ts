import assert from "node:assert/strict";
import test from "node:test";

import { COLOR_MAP, headTones, strokeBoost } from "./avatar-colors.ts";
import { AVATAR_COLORS } from "./bot-types.ts";

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

test("every avatar colour has a body colour", () => {
  for (const color of AVATAR_COLORS) {
    assert.match(COLOR_MAP[color], /^#[0-9A-F]{6}$/, color);
  }
});

test("bright bodies are saturated, not washed out", () => {
  for (const color of AVATAR_COLORS.filter((c) => c !== "black")) {
    const rgb = channels(COLOR_MAP[color]);
    const spread = Math.max(...rgb) - Math.min(...rgb);
    assert.ok(spread >= 150, `${color} is too grey (${spread})`);
  }
});

test("bright heads have dark eyes with a white catchlight", () => {
  const tones = headTones("teal");
  assert.equal(tones.base, COLOR_MAP.teal);
  assert.equal(tones.eyes, "#16161B");
  assert.equal(tones.catchlight, "#FFFFFF");
});

test("black heads are graphite with light eyes, never pure black", () => {
  const tones = headTones("black");
  assert.notEqual(tones.base.toLowerCase(), "#000000");
  assert.equal(tones.eyes, "#F5F5F5");
  assert.equal(tones.catchlight, tones.base);
});

test("unknown (legacy) colours fall back to cyan", () => {
  assert.equal(headTones("plum" as never).base, COLOR_MAP.cyan);
});

test("strokeBoost thickens outlines at small sizes only", () => {
  assert.ok(strokeBoost(28) > strokeBoost(56));
  assert.ok(strokeBoost(56) > strokeBoost(128));
  assert.ok(strokeBoost(8) <= 2.4);
  assert.ok(strokeBoost(512) >= 1);
});
