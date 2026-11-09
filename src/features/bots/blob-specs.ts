import type { AvatarShape } from "./bot-types.ts";

/*
 * The hand-placed outline of every crew head: corner points, softness and
 * where the eyes sit. Turning a spec into a drawn blob lives in blob-art.ts.
 */

export type Point = readonly [number, number];

export interface BlobSpec {
  points: readonly Point[];
  /** Corner softness, for every corner or per corner. */
  soft: number | readonly number[];
  eyeY: number;
  eyeHeight?: number;
  tilt?: number;
  /** Shine centre, when the default spot falls outside the body. */
  shine?: Point;
}

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

function polar([cx, cy]: Point, r: number, angle: number): Point {
  return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
}

export const SPECS: Record<AvatarShape, BlobSpec> = {
  hexagon: {
    points: ring(6, [50, 55], [44, 38], 0),
    soft: 0.42,
    eyeY: 52,
  },
  square: {
    points: [
      [14, 18],
      [86, 18],
      [88, 89],
      [12, 89],
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
  ghost: {
    // A round dome over three soft scallops.
    points: [
      [50, 10],
      [86, 26],
      [88, 90],
      [68, 80],
      [50, 92],
      [32, 80],
      [12, 90],
      [14, 26],
    ],
    soft: [0.5, 0.5, 0.3, 0.5, 0.5, 0.5, 0.3, 0.5],
    eyeY: 46,
  },
  flower: {
    // Five round petals around the face.
    points: [0, 1, 2, 3, 4].flatMap((k) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
      return [
        polar([50, 54], 44, a - 0.3),
        polar([50, 54], 44, a + 0.3),
        polar([50, 54], 23, a + Math.PI / 5),
      ];
    }),
    soft: [0, 1, 2, 3, 4].flatMap(() => [0.5, 0.5, 0.3]),
    eyeY: 55,
    eyeHeight: 16,
  },
  clover: {
    // Four round leaves with deep notches between them.
    points: [0, 1, 2, 3].flatMap((k) => {
      const a = -Math.PI / 4 + (k * Math.PI) / 2;
      return [
        polar([50, 52], 30, a - 0.72),
        polar([50, 52], 46, a - 0.36),
        polar([50, 52], 46, a + 0.36),
        polar([50, 52], 30, a + 0.72),
        polar([50, 52], 17, a + Math.PI / 4),
      ];
    }),
    soft: [0, 1, 2, 3].flatMap(() => [0.5, 0.5, 0.5, 0.5, 0.3]),
    eyeY: 53,
    eyeHeight: 16,
  },
  dumpling: {
    // A squishy bun: a wide soft base and a pinched, pleated top.
    points: [
      [50, 14],
      [57, 25],
      [66, 24],
      [72, 32],
      [84, 40],
      [95, 66],
      [86, 88],
      [14, 88],
      [5, 66],
      [16, 40],
      [28, 32],
      [34, 24],
      [43, 25],
    ],
    soft: [0.45, 0.4, 0.5, 0.4, 0.5, 0.5, 0.4, 0.4, 0.5, 0.5, 0.4, 0.5, 0.4],
    eyeY: 60,
    eyeHeight: 15,
  },
  shield: {
    // A soft badge with a rounded point.
    points: [
      [50, 14],
      [88, 16],
      [86, 56],
      [50, 92],
      [14, 56],
      [12, 16],
    ],
    soft: [0.5, 0.35, 0.5, 0.35, 0.5, 0.35],
    eyeY: 46,
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
    points: ring(5, [50, 56], [43, 41]),
    soft: 0.46,
    eyeY: 55,
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
      // 0.4, not 0.5: sin(30°) lands on either side of 0.5 in floating point.
      const k = Math.sin(angle) > 0.4 ? 0.94 : i % 2 ? 0.86 : 1.04;
      return [k, k];
    }),
    soft: 0.5,
    eyeY: 56,
  },
};
