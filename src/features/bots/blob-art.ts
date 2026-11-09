import { AVATAR_SHAPES, type AvatarShape } from "./bot-types.ts";

/*
 * The crew as soft blobs: every geometric shape drawn as if it went squishy.
 * Each corner is rounded by a share of its edges (0.5 = fully soft) and the
 * points get a small seeded wobble, so the heads look drawn by hand. Pure
 * geometry on a 0 0 100 100 viewBox; colours live in avatar-colors.ts.
 */

export type Point = readonly [number, number];

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

interface BlobSpec {
  points: readonly Point[];
  /** Corner softness, for every corner or per corner. */
  soft: number | readonly number[];
  eyeY: number;
  eyeHeight?: number;
  tilt?: number;
  /** Shine centre, when the default spot falls outside the body. */
  shine?: Point;
}

const WOBBLE = 1.8;
const EYE_GAP = 19;
const EYE_WIDTH = 9;
const EYE_HEIGHT = 18;

/** Points around an ellipse; `warp` scales the x and y radius per angle. */
function ring(
  count: number,
  [cx, cy]: Point,
  [rx, ry]: Point,
  start = -Math.PI / 2,
  warp: (angle: number, index: number) => Point = () => [1, 1],
): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = start + (i / count) * Math.PI * 2;
    const [kx, ky] = warp(angle, i);
    return [cx + Math.cos(angle) * rx * kx, cy + Math.sin(angle) * ry * ky];
  });
}

const SPECS: Record<AvatarShape, BlobSpec> = {
  hexagon: {
    points: ring(6, [50, 55], [44, 38], 0),
    soft: 0.42,
    eyeY: 52,
    tilt: -6,
  },
  square: {
    points: [
      [14, 20],
      [86, 17],
      [89, 88],
      [11, 90],
    ],
    soft: 0.36,
    eyeY: 52,
    eyeHeight: 19,
  },
  circle: { points: ring(10, [50, 54], [40, 38]), soft: 0.5, eyeY: 53 },
  octagon: {
    points: ring(8, [50, 60], [44, 32], -Math.PI / 2 + Math.PI / 8),
    soft: 0.5,
    eyeY: 58,
    eyeHeight: 15,
  },
  diamond: {
    points: [
      [50, 8],
      [90, 54],
      [50, 93],
      [10, 54],
    ],
    soft: [0.16, 0.5, 0.5, 0.5],
    eyeY: 60,
    shine: [36, 40],
  },
  triangle: {
    points: [
      [50, 12],
      [93, 88],
      [7, 88],
    ],
    soft: 0.4,
    eyeY: 64,
    eyeHeight: 15,
    shine: [40, 42],
  },
  pentagon: {
    points: ring(5, [50, 56], [43, 41], -Math.PI / 2 + 0.12),
    soft: 0.46,
    eyeY: 55,
    tilt: 8,
  },
  egg: {
    points: ring(10, [50, 53], [34, 41], -Math.PI / 2, (angle) => [
      1 + 0.14 * Math.sin(angle),
      1,
    ]),
    soft: 0.5,
    eyeY: 54,
  },
  cloud: {
    points: ring(12, [50, 56], [44, 36], -Math.PI / 2, (angle, i) => {
      const k = Math.sin(angle) > 0.5 ? 0.94 : i % 2 ? 0.86 : 1.04;
      return [k, k];
    }),
    soft: 0.5,
    eyeY: 56,
  },
};

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

function drawBlob(spec: BlobSpec, seed: number): BlobArt {
  const random = mulberry32(seed);
  const points = spec.points.map(([x, y]): Point => [
    x + (random() * 2 - 1) * WOBBLE,
    y + (random() * 2 - 1) * WOBBLE,
  ]);
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
