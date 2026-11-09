// Draws the Open Bot mark as one of the crew heads, in graphite pencil with no
// colour: a round head with the crew's hatching, outline passes, pill eyes and
// construction lines. The random generator is seeded, so the drawing is the
// same on every run. It writes the art data and the static icon:
//   npm run brand:draw
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

const SEED = 20261109;
// The crew heads sit on a 100 box with a radius of 32; this one sits on a
// 64 tile, so every crew measure is scaled by HEAD.r / 32.
const HEAD = { cx: 32, cy: 32.5, r: 19 };
const SCALE = HEAD.r / 32;

function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(SEED);
const between = (min, max) => min + (max - min) * rand();
const num = (v) => {
  const s = String(Math.round(v * 100) / 100);
  return s === "-0" ? "0" : s;
};
const point = ([x, y]) => `${num(x)} ${num(y)}`;
const radians = (deg) => (deg * Math.PI) / 180;

/** Catmull-Rom through the points, written as cubic Bézier segments. */
function smooth(points) {
  let d = `M${point(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [
      points[i - 1] ?? points[i],
      points[i],
      points[i + 1],
      points[i + 2] ?? points[i + 1],
    ];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${point(c1)} ${point(c2)} ${point(p2)}`;
  }
  return d;
}

/** One hand-drawn pass around the head: a slow wobble and a loose overshoot. */
function pencilPass({ r, amp, start, sweep = 372, drift = 0.4, step = 8 }) {
  const from = start ?? between(0, 360);
  const [k1, k2] = [2 + Math.floor(rand() * 2), 3 + Math.floor(rand() * 3)];
  const [p1, p2] = [between(0, 2 * Math.PI), between(0, 2 * Math.PI)];
  const [ox, oy] = [between(-0.15, 0.15), between(-0.15, 0.15)];
  const points = [];
  for (let a = 0; a <= sweep; a += step) {
    const theta = radians(from + a);
    const wobble =
      amp * (0.6 * Math.sin(k1 * theta + p1) + 0.4 * Math.sin(k2 * theta + p2));
    const progress = a / sweep;
    const tail = progress > 0.9 ? drift * ((progress - 0.9) / 0.1) : 0;
    const radius = r + wobble + tail;
    points.push([
      HEAD.cx + ox + radius * Math.cos(theta),
      HEAD.cy + oy + radius * Math.sin(theta),
    ]);
  }
  return smooth(points);
}

/** Long strokes across the head, one per chord, like the crew's hatching. */
function hatch({ angle, spacing, phase = 0, from, inset = 0.5 }) {
  const { cx, cy } = HEAD;
  const r = HEAD.r - inset;
  const a = radians(angle);
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const [nx, ny] = [-dy, dx];
  const at = (o, s) => [cx + nx * o + dx * s, cy + ny * o + dy * s];
  let d = "";
  for (let t = (from ?? -r) + phase; t < r; t += spacing) {
    const o = t + between(-0.2, 0.2);
    if (Math.abs(o) >= r - 1) continue;
    const half = Math.sqrt(r * r - o * o);
    const s = -half + between(0, 0.6);
    const e = half - between(0, 0.6);
    const mid = at(o + between(-0.5, 0.5), (s + e) / 2);
    d += `M${point(at(o, s))}Q${point(mid)} ${point(at(o, e))}`;
  }
  return d;
}

function line(x1, y1, x2, y2) {
  const mid = [
    (x1 + x2) / 2 + between(-0.4, 0.4),
    (y1 + y2) / 2 + between(-0.4, 0.4),
  ];
  return `M${num(x1)} ${num(y1)}Q${point(mid)} ${num(x2)} ${num(y2)}`;
}

function arc(r, fromDeg, toDeg) {
  const at = (deg) => [
    HEAD.cx + r * Math.cos(radians(deg)),
    HEAD.cy + r * Math.sin(radians(deg)),
  ];
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M${point(at(fromDeg))}A${num(r)} ${num(r)} 0 ${large} 1 ${point(at(toDeg))}`;
}

function circlePath(r) {
  const { cx, cy } = HEAD;
  return `M${num(cx + r)} ${num(cy)}a${r} ${r} 0 1 0 ${num(-2 * r)} 0a${r} ${r} 0 1 0 ${num(2 * r)} 0Z`;
}

/** A pill eye, leaning right by `tilt` degrees like the crew's eyes. */
function eye(x, y) {
  const r = 4.1 * SCALE * 1.08;
  const half = 5.7 * SCALE;
  const t = radians(7.5);
  const [ux, uy] = [Math.sin(t), -Math.cos(t)];
  const [px, py] = [Math.cos(t), Math.sin(t)];
  const top = [x + ux * half, y + uy * half];
  const bottom = [x - ux * half, y - uy * half];
  const side = (c, k) => [c[0] + px * r * k, c[1] + py * r * k];
  const R = num(r);
  return (
    `M${point(side(top, -1))}L${point(side(bottom, -1))}` +
    `A${R} ${R} 0 0 0 ${point(side(bottom, 1))}` +
    `L${point(side(top, 1))}A${R} ${R} 0 0 0 ${point(side(top, -1))}Z`
  );
}

const { cx, cy, r } = HEAD;
const k = SCALE;
const art = {
  body: circlePath(r),
  guides: [
    { d: line(4, cy + 2.4, 60, cy - 2.4), width: 0.6 * k, opacity: 0.82 },
    { d: line(cx - 2.6, 4, cx + 2.4, 60), width: 0.6 * k, opacity: 0.72 },
    {
      d: line(cx - 16, cy + 20, cx + 17, cy - 20.5),
      width: 0.6 * k,
      opacity: 0.8,
    },
    { d: arc(r * 1.2, 205, 375), width: 0.6 * k, opacity: 0.4 },
  ],
  hatch: [
    {
      d: hatch({ angle: -38, spacing: 4.2, phase: 1 }),
      tone: "light",
      width: 1.5 * k,
      opacity: 0.55,
    },
    {
      d: hatch({ angle: -38, spacing: 3.4, phase: 2.6 }),
      tone: "light",
      width: 1.5 * k,
      opacity: 0.35,
    },
    {
      d: hatch({ angle: 28, spacing: 4.6, phase: 0.8 }),
      tone: "dark",
      width: 1.2 * k,
      opacity: 0.35,
    },
    {
      d: hatch({ angle: 28, spacing: 6, phase: 3 }),
      tone: "dark",
      width: 1.2 * k,
      opacity: 0.2,
    },
    {
      d: hatch({ angle: -45, spacing: 2.6, from: 5 }),
      tone: "shade",
      width: 1.5 * k,
      opacity: 0.3,
    },
    {
      d: hatch({ angle: -45, spacing: 1.8, from: 3, phase: 0.9 }),
      tone: "shade",
      width: 1.5 * k,
      opacity: 0.18,
    },
  ],
  ink: [
    { d: pencilPass({ r, amp: 0.22 }), width: 1.7 * k, opacity: 0.83 },
    {
      d: pencilPass({ r: r - 0.3, amp: 0.2, start: 300, sweep: 200, step: 10 }),
      width: 0.9 * k,
      opacity: 0.38,
    },
    {
      d: pencilPass({ r: r + 0.3, amp: 0.2, start: -10, sweep: 120, step: 10 }),
      width: 1.1 * k,
      opacity: 0.49,
    },
  ],
  eyes: [
    { d: eye(cx - 0.3 * r, cy + 0.02 * r), fillOpacity: 0.96 },
    { d: eye(cx + 0.31 * r, cy - 0.04 * r), fillOpacity: 0.93 },
  ],
};

const root = new URL("../", import.meta.url);
const artFile = fileURLToPath(
  new URL("src/shared/brand/brand-mark-art.ts", root),
);
const source = `// Generated by scripts/draw-brand-mark.mjs, not hand-edited. The Open Bot mark:
// a crew head drawn in graphite pencil on a 0 0 64 64 viewBox. Colours are
// applied by brand-mark-layers.ts.

export const BRAND_MARK_ART = ${JSON.stringify(art)} as const;
`;
writeFileSync(artFile, await prettier.format(source, { filepath: artFile }));
console.log("wrote", artFile);

const { brandMarkSvg, STATIC_ICON } = await import(
  new URL("src/shared/brand/brand-mark-layers.ts", root).href
);
const iconFile = fileURLToPath(new URL("public/openbot-icon.svg", root));
writeFileSync(iconFile, brandMarkSvg(STATIC_ICON));
console.log("wrote", iconFile);
