import { AVATAR_SHAPES, type AvatarShape } from "./bot-types.ts";
import { SPECS, type BlobSpec, type Point } from "./blob-specs.ts";

/*
 * The crew as soft blobs: every geometric shape drawn as if it went squishy.
 * Each corner is rounded by a share of its edges (0.5 = fully soft) and the
 * points get a small seeded wobble, so the heads look drawn by hand. The
 * wobble is mirrored across the middle, so every head stays symmetric. Pure
 * geometry on a 0 0 100 100 viewBox; colours live in avatar-colors.ts.
 */

export type { Point };

export interface BlobEyes {
  /** Centre of each pill eye. */
  left: Point;
  right: Point;
  width: number;
  height: number;
  /** Degrees; gives each shape its own expression. */
  tilt: number;
}

export interface BlobArt {
  body: string;
  eyes: BlobEyes;
  /** Centre of the shine on the lit side. */
  highlight: Point;
}

const WOBBLE = 1.8;
const EYE_GAP = 19;
const EYE_WIDTH = 9;
const EYE_HEIGHT = 18;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fixed(value: number): number {
  return Math.round(value * 10) / 10;
}

function lerp([ax, ay]: Point, [bx, by]: Point, k: number): Point {
  return [fixed(ax + (bx - ax) * k), fixed(ay + (by - ay) * k)];
}

/** A closed path that cuts every corner with a quadratic curve. */
export function softPolygon(
  points: readonly Point[],
  soft: number | readonly number[],
): string {
  const share = (i: number) => (typeof soft === "number" ? soft : soft[i]!);
  const n = points.length;
  const at = (i: number) => points[(i + n) % n]!;
  const parts: string[] = [];
  let last = "";
  points.forEach((corner, i) => {
    const enter = lerp(corner, at(i - 1), share(i)).join(" ");
    const leave = lerp(corner, at(i + 1), share(i)).join(" ");
    // Fully soft neighbours meet at the edge midpoint: no straight run.
    if (i === 0) parts.push(`M${enter}`);
    else if (enter !== last) parts.push(`L${enter}`);
    parts.push(`Q${corner.map(fixed).join(" ")} ${leave}`);
    last = leave;
  });
  return `${parts.join("")}Z`;
}

/** The index of the point mirrored across x = 50, or -1 when there is none. */
function mirrorOf(points: readonly Point[], [x, y]: Point): number {
  return points.findIndex(
    ([mx, my]) => Math.abs(mx - (100 - x)) < 0.5 && Math.abs(my - y) < 0.5,
  );
}

/** A seeded wobble that moves mirrored points as mirror images. */
function mirroredWobble(points: readonly Point[], seed: number): Point[] {
  const random = mulberry32(seed);
  const moved: Point[] = [...points];
  points.forEach((point, i) => {
    const twin = mirrorOf(points, point);
    if (twin !== -1 && twin < i) return;
    const dx = twin === i ? 0 : (random() * 2 - 1) * WOBBLE;
    const dy = (random() * 2 - 1) * WOBBLE;
    moved[i] = [point[0] + dx, point[1] + dy];
    if (twin !== -1 && twin !== i) {
      moved[twin] = [points[twin]![0] - dx, points[twin]![1] + dy];
    }
  });
  return moved;
}

function drawBlob(spec: BlobSpec, seed: number): BlobArt {
  const points = mirroredWobble(spec.points, seed);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const cx = fixed((minX + maxX) / 2);
  return {
    body: softPolygon(points, spec.soft),
    eyes: {
      left: [fixed(cx - EYE_GAP / 2), spec.eyeY],
      right: [fixed(cx + EYE_GAP / 2), spec.eyeY],
      width: EYE_WIDTH,
      height: spec.eyeHeight ?? EYE_HEIGHT,
      tilt: spec.tilt ?? 0,
    },
    highlight: spec.shine ?? [
      fixed(minX + (maxX - minX) * 0.27),
      fixed(minY + (maxY - minY) * 0.2),
    ],
  };
}

/** Seed from the shape name, so a head never changes when shapes are added. */
function seedOf(shape: AvatarShape): number {
  return Array.from(shape).reduce(
    (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0,
    20261109,
  );
}

/** The drawn blob for every avatar shape. */
export const BLOB_ART: Readonly<Record<AvatarShape, BlobArt>> =
  Object.fromEntries(
    AVATAR_SHAPES.map((shape) => [
      shape,
      drawBlob(SPECS[shape], seedOf(shape)),
    ]),
  ) as Record<AvatarShape, BlobArt>;
