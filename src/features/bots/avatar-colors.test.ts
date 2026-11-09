import assert from "node:assert/strict";
import test from "node:test";

import {
  COLOR_MAP,
  avatarSwatch,
  headTones,
  mix,
  strokeBoost,
} from "./avatar-colors.ts";
import { AVATAR_COLORS, type AvatarColor } from "./bot-types.ts";

test("mix blends toward the other colour", () => {
  assert.equal(mix("#2DD4BF", "#FFFFFF", 0), "#2DD4BF");
  assert.equal(mix("#808080", "#FFFFFF", 0.35), "#ACACAC");
  assert.equal(mix("#FF8000", "#000000", 0.5), "#804000");
  assert.equal(mix("#000000", "#FFFFFF", 1), "#FFFFFF");
});

test("headTones derives hatch tones and ink tokens from the pigment", () => {
  const tones = headTones("viridian");
  assert.equal(tones.base, "#35A58C");
  assert.equal(tones.light, mix("#35A58C", "#FFFFFF", 0.35));
  assert.equal(tones.dark, mix("#35A58C", "#000000", 0.22));
  assert.equal(tones.shade, mix("#35A58C", "#000000", 0.35));
  assert.equal(tones.ink, "#E5E5E5");
  assert.equal(headTones("viridian", true).ink, "#2A2A2A");
  assert.equal(tones.eyes, "#0A0A0A");
});

test("every pigment has a swatch, and graphite is a mid grey", () => {
  for (const color of AVATAR_COLORS) {
    assert.match(COLOR_MAP[color], /^#[0-9A-F]{6}$/, color);
  }
  const graphite = headTones("graphite");
  assert.equal(graphite.base, "#8B8E95");
  assert.notEqual(graphite.base, "#000000");
  assert.equal(graphite.eyes, "#0A0A0A");
});

test("unknown legacy colours fall back to the cerulean swatch", () => {
  assert.equal(avatarSwatch("teal" as AvatarColor), COLOR_MAP.cerulean);
});

test("strokeBoost thickens outlines at small sizes only", () => {
  assert.ok(strokeBoost(28) > strokeBoost(56));
  assert.ok(strokeBoost(56) > strokeBoost(128));
  assert.ok(strokeBoost(8) <= 2.4);
  assert.ok(strokeBoost(512) >= 1);
});
