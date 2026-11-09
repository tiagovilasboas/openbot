// Draws the Open Bot mark as one of the crew heads, the way a graphite pencil
// sketch would: no fill and no colour, only pencil lines. Outline passes,
// hatching on the shadow side, pill eyes filled in with a scribble, and faint
// construction lines. The random generator is seeded, so the drawing is the
// same on every run. It writes the art data and the static icon:
//   npm run brand:draw
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

const SEED = 20261109;
// The crew heads sit on a 100 box with a radius of 32; this one sits on a
// 64 box, so every crew measure is scaled by HEAD.r / 32.
const HEAD = { cx: 32, cy: 32, r: 19 };
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

/**
 * Parallel pencil strokes across the head, one per chord, kept to the band
 * of offsets [from, to] measured along the strokes' normal.
 */
function hatch({ angle, spacing, from, to, inset = 0.8 }) {
  const { cx, cy } = HEAD;
  const r = HEAD.r - inset;
  const a = radians(angle);
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const [nx, ny] = [-dy, dx];
  const at = (o, s) => [cx + nx * o + dx * s, cy + ny * o + dy * s];
  let d = "";
  for (let t = from ?? -r; t <= (to ?? r); t += spacing) {
    const o = t + between(-0.15, 0.15);
    if (Math.abs(o) >= r - 0.6) continue;
    const half = Math.sqrt(r * r - o * o);
    const s = -half + between(0.1, 0.9);
    const e = half - between(0.1, 0.9);
    const mid = at(o + between(-0.3, 0.3), (s + e) / 2);
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

/** A pill eye leaning right like the crew's: its frame and axis. */
function eyeFrame(x, y) {
  const t = radians(7.5);
  return {
    c: [x, y],
    u: [Math.sin(t), -Math.cos(t)],
    p: [Math.cos(t), Math.sin(t)],
    r: 4.1 * SCALE * 1.08,
    half: 5.7 * SCALE,
  };
}

const along = (f, s, w) => [
  f.c[0] + f.u[0] * s + f.p[0] * w,
  f.c[1] + f.u[1] * s + f.p[1] * w,
];

/** The pill's outline. */
function eyeOutline(f) {
  const R = num(f.r);
  return (
    `M${point(along(f, f.half, -f.r))}L${point(along(f, -f.half, -f.r))}` +
    `A${R} ${R} 0 0 0 ${point(along(f, -f.half, f.r))}` +
    `L${point(along(f, f.half, f.r))}A${R} ${R} 0 0 0 ${point(along(f, f.half, -f.r))}Z`
  );
}

/** The pill filled in the way a pencil does it: a tight back-and-forth. */
function eyeScribble(f, step, phase) {
  const end = f.half + f.r - 0.35;
  const points = [];
  let side = 1;
  for (let s = -end + phase; s <= end; s += step) {
    const cap = Math.max(0, Math.abs(s) - f.half);
    const w = Math.sqrt(Math.max(0, f.r * f.r - cap * cap)) - 0.35;
    points.push(along(f, s, side * w + between(-0.12, 0.12)));
    side = -side;
  }
  return `M${points.map(point).join("L")}`;
}

const { cx, cy, r } = HEAD;
const k = SCALE;
const eyes = [
  eyeFrame(cx - 0.3 * r, cy + 0.02 * r),
  eyeFrame(cx + 0.31 * r, cy - 0.04 * r),
];
const art = {
  guides: [
    { d: line(5, cy + 2.4, 59, cy - 2.4), width: 0.35, opacity: 0.3 },
    { d: line(cx - 2.6, 5, cx + 2.4, 59), width: 0.35, opacity: 0.26 },
    {
      d: line(cx - 16, cy + 20, cx + 17, cy - 20.5),
      width: 0.35,
      opacity: 0.3,
    },
    { d: arc(r * 1.2, 205, 375), width: 0.35, opacity: 0.2 },
  ],
  // Light from the upper left: the shadow side is drawn, the rest stays paper.
  hatch: [
    {
      d: hatch({ angle: -45, spacing: 1.25, from: 8.5 }),
      width: 0.42,
      opacity: 0.5,
    },
    {
      d: hatch({ angle: 80, spacing: 1.5, to: -11 }),
      width: 0.36,
      opacity: 0.32,
    },
    {
      d: hatch({ angle: -45, spacing: 2.4, from: 2, to: 8 }),
      width: 0.32,
      opacity: 0.22,
    },
  ],
  ink: [
    { d: pencilPass({ r, amp: 0.22 }), width: 1.7 * k, opacity: 0.9 },
    {
      d: pencilPass({
        r: r - 0.4,
        amp: 0.25,
        start: 300,
        sweep: 220,
        step: 10,
      }),
      width: 0.9 * k,
      opacity: 0.45,
    },
    {
      d: pencilPass({
        r: r + 0.5,
        amp: 0.25,
        start: -15,
        sweep: 140,
        drift: 0.6,
        step: 10,
      }),
      width: 1.1 * k,
      opacity: 0.5,
    },
  ],
  eyes: eyes.flatMap((f) => [
    { d: eyeScribble(f, 0.42, 0), width: 0.8, opacity: 0.92 },
    { d: eyeScribble(f, 0.6, 0.21), width: 0.6, opacity: 0.6 },
    { d: eyeOutline(f), width: 0.6, opacity: 0.85 },
  ]),
};

const root = new URL("../", import.meta.url);
const artFile = fileURLToPath(
  new URL("src/shared/brand/brand-mark-art.ts", root),
);
const source = `// Generated by scripts/draw-brand-mark.mjs, not hand-edited. The Open Bot mark:
// a crew head sketched in graphite pencil on a 0 0 64 64 viewBox, lines only.
// The pencil colour is applied by brand-mark-layers.ts.

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
