import assert from "node:assert/strict";
import test from "node:test";

import { BLOB_ART, softPolygon } from "./blob-art.ts";
import { AVATAR_SHAPES } from "./bot-types.ts";

function numbers(path: string): number[] {
  return (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

test("every avatar shape has a closed blob", () => {
  for (const shape of AVATAR_SHAPES) {
    const { body } = BLOB_ART[shape];
    assert.match(body, /^M[\d. ]+/, shape);
    assert.match(body, /Z$/, shape);
    assert.ok(body.includes("Q"), `${shape} has no soft corners`);
  }
});

test("blobs stay inside the viewBox", () => {
  for (const shape of AVATAR_SHAPES) {
    for (const value of numbers(BLOB_ART[shape].body)) {
      assert.ok(value >= 1 && value <= 99, `${shape} reaches ${value}`);
    }
  }
});

test("eyes sit side by side inside the head", () => {
  for (const shape of AVATAR_SHAPES) {
    const { eyes, highlight } = BLOB_ART[shape];
    assert.equal(eyes.left[1], eyes.right[1], shape);
    assert.ok(eyes.left[0] < eyes.right[0], shape);
    for (const [x, y] of [eyes.left, eyes.right, highlight]) {
      assert.ok(x > 10 && x < 90 && y > 10 && y < 90, `${shape} ${x},${y}`);
    }
  }
});

test("every head is mirror-symmetric", () => {
  for (const shape of AVATAR_SHAPES) {
    const { body, eyes } = BLOB_ART[shape];
    const values = numbers(body);
    const points: Array<[number, number]> = [];
    for (let i = 0; i + 1 < values.length; i += 2) {
      points.push([values[i]!, values[i + 1]!]);
    }
    for (const [x, y] of points) {
      const twin = points.some(
        ([mx, my]) =>
          Math.abs(mx - (100 - x)) <= 0.15 && Math.abs(my - y) <= 0.15,
      );
      assert.ok(twin, `${shape} has no mirror for ${x},${y}`);
    }
    assert.ok(Math.abs(eyes.left[0] + eyes.right[0] - 100) <= 0.2, shape);
    assert.equal(eyes.tilt, 0, shape);
  }
});

test("every shape draws its own silhouette", () => {
  const bodies = new Set(AVATAR_SHAPES.map((s) => BLOB_ART[s].body));
  assert.equal(bodies.size, AVATAR_SHAPES.length);
});

test("softPolygon rounds a square through its edge midpoints", () => {
  const path = softPolygon(
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    0.5,
  );
  assert.equal(path, "M0 5Q0 0 5 0Q10 0 10 5Q10 10 5 10Q0 10 0 5Z");
});
