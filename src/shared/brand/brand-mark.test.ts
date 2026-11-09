import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  STATIC_ICON,
  brandMarkLayers,
  brandMarkSvg,
} from "./brand-mark-layers.ts";

test("public/openbot-icon.svg matches the drawn mark", () => {
  const onDisk = readFileSync(
    new URL("../../../public/openbot-icon.svg", import.meta.url),
    "utf8",
  );
  assert.equal(
    onDisk,
    brandMarkSvg(STATIC_ICON),
    "run `npm run brand:draw` after changing the mark",
  );
});

test("the in-app mark drops construction lines and takes the tile class", () => {
  const withGuides = brandMarkLayers({ tile: "rounded", guides: true });
  const layers = brandMarkLayers({
    tile: "rounded",
    guides: false,
    tileClassName: "fill-surface",
  });
  assert.ok(layers.length < withGuides.length);
  assert.equal(layers[0].attrs.className, "fill-surface");
  assert.equal(layers[0].attrs.fill, undefined);
});

test("the head is graphite only: every paint is a grey", () => {
  const svg = brandMarkSvg(STATIC_ICON);
  const paints = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)];
  assert.ok(paints.length > 0);
  for (const [, hex] of paints) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(
      Math.max(r, g, b) - Math.min(r, g, b) <= 10,
      `${hex} is a colour`,
    );
  }
});

test("a heavier weight only thickens the outline", () => {
  const plain = brandMarkLayers({ tile: "none", guides: false });
  const heavy = brandMarkLayers({ tile: "none", guides: false, weight: 2 });
  assert.equal(plain.length, heavy.length);
  const outline = (nodes: typeof plain) =>
    nodes.find((node) => node.attrs.stroke === "#E5E5E5")?.attrs.strokeWidth;
  assert.ok(Number(outline(heavy)) > Number(outline(plain)));
});

test("a maskable mark has no tile and no clip paths or filters", () => {
  const svg = brandMarkSvg({ ...STATIC_ICON, tile: "none" });
  assert.doesNotMatch(svg, /<rect/);
  assert.doesNotMatch(svg, /clip-path|filter/);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});
