import assert from "node:assert/strict";
import test from "node:test";

import { headTones, mix, strokeBoost } from "./avatar-colors.ts";

test("mix blends toward the other colour", () => {
  assert.equal(mix("#2DD4BF", "#FFFFFF", 0), "#2DD4BF");
  assert.equal(mix("#808080", "#FFFFFF", 0.35), "#ACACAC");
  assert.equal(mix("#FF8000", "#000000", 0.5), "#804000");
  assert.equal(mix("#000000", "#FFFFFF", 1), "#FFFFFF");
});

test("headTones derives hatch tones and ink tokens from the base colour", () => {
  const tones = headTones("teal");
  assert.equal(tones.base, "#2DD4BF");
  assert.equal(tones.light, mix("#2DD4BF", "#FFFFFF", 0.35));
  assert.equal(tones.dark, mix("#2DD4BF", "#000000", 0.22));
  assert.equal(tones.shade, mix("#2DD4BF", "#000000", 0.35));
  assert.equal(tones.ink, "#E5E5E5");
  assert.equal(headTones("teal", true).ink, "#2A2A2A");
  assert.equal(tones.eyes, "#0A0A0A");
});

test("black heads are dark grey with light eyes, never pure black", () => {
  const tones = headTones("black");
  assert.notEqual(tones.base.toLowerCase(), "#000000");
  assert.equal(tones.base, "#3F3F46");
  assert.equal(tones.eyes, "#F5F5F5");
});

test("strokeBoost thickens outlines at small sizes only", () => {
  assert.ok(strokeBoost(28) > strokeBoost(56));
  assert.ok(strokeBoost(56) > strokeBoost(128));
  assert.ok(strokeBoost(8) <= 2.4);
  assert.ok(strokeBoost(512) >= 1);
});
