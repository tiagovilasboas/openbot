import assert from "node:assert/strict";
import test from "node:test";
import { botAccent, botAvatarTones } from "./bot-accent.ts";
import { AVATAR_COLORS, type AvatarColor } from "./bot-types.ts";

// --background in globals.css.
const GROUND = "oklch(0.13 0.004 264)";

function parseOklch(value: string): [number, number, number] {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
  assert.ok(match, `not a plain oklch() value: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function linearSrgb(value: string): number[] {
  const [l, c, h] = parseOklch(value);
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lms = [
    (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (l - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ];
  return [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ];
}

function contrast(foreground: string, background: string): number {
  const luminance = (rgb: number[]) =>
    0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const [high, low] = [
    luminance(linearSrgb(foreground)),
    luminance(linearSrgb(background)),
  ].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test("every avatar color has an in-gamut accent that reads on the ground", () => {
  for (const color of AVATAR_COLORS) {
    const accent = botAccent(color);
    const ratio = contrast(accent, GROUND);
    assert.ok(ratio >= 4.5, `${color} accent contrast ${ratio.toFixed(2)}`);
    for (const channel of linearSrgb(accent)) {
      assert.ok(channel >= -0.001 && channel <= 1.001, `${color} out of sRGB`);
    }
  }
});

test("black maps to a light neutral graphite accent", () => {
  const [lightness, chroma] = parseOklch(botAccent("black"));
  assert.ok(lightness >= 0.75);
  assert.ok(chroma <= 0.02);
});

test("unknown legacy colors fall back to the cyan accent", () => {
  assert.equal(botAccent("chartreuse" as AvatarColor), botAccent("cyan"));
});

test("avatar tones keep bright bots vivid and the graphite bot dark", () => {
  const cyan = botAvatarTones("cyan");
  assert.equal(cyan.edge, cyan.accent);
  assert.match(
    cyan.bottom,
    /color-mix\(in oklab, .+ 58%, var\(--background\)\)/,
  );

  const graphite = botAvatarTones("black");
  assert.notEqual(graphite.edge, graphite.accent);
  assert.match(graphite.top, / 34%, /);
});
