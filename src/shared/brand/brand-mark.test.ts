import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GRAPHITE,
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

test("the sketch is lines only: nothing is filled", () => {
  const layers = brandMarkLayers({ tile: "none", guides: true });
  assert.ok(layers.length > 0);
  for (const node of layers) {
    assert.equal(node.tag, "path");
    assert.equal(node.attrs.fill, "none");
  }
});

test("the in-app sketch draws in the text colour without guides", () => {
  const withGuides = brandMarkLayers({ tile: "none", guides: true });
  const layers = brandMarkLayers({ tile: "none", guides: false });
  assert.ok(layers.length < withGuides.length);
  assert.ok(layers.every((node) => node.attrs.stroke === "currentColor"));
});

test("the static icon picks a graphite for the viewer's scheme", () => {
  const svg = brandMarkSvg(STATIC_ICON);
  assert.doesNotMatch(svg, /<rect/);
  assert.match(svg, new RegExp(`color:${GRAPHITE.onLight}`));
  assert.match(
    svg,
    new RegExp(`prefers-color-scheme:dark\\)\\{svg\\{color:${GRAPHITE.onDark}`),
  );
});

test("every pencil tone is a grey", () => {
  for (const hex of Object.values(GRAPHITE)) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(
      Math.max(r, g, b) - Math.min(r, g, b) <= 10,
      `${hex} is a colour`,
    );
  }
});

test("a heavier weight presses the outline harder", () => {
  const widest = (weight: number) =>
    Math.max(
      ...brandMarkLayers({ tile: "none", guides: false, weight }).map((node) =>
        Number(node.attrs.strokeWidth),
      ),
    );
  assert.ok(widest(2) > widest(1));
});

test("an install icon has an explicit ink and no clip paths or filters", () => {
  const svg = brandMarkSvg({
    tile: "none",
    guides: true,
    ink: GRAPHITE.onDark,
  });
  assert.doesNotMatch(svg, /<style|currentColor|clip-path|filter/);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});
