// Draws the Open Bot mark: the ghost head as a calm graphite pencil sketch.
// A firm outline with a lighter second pass slightly off register, diagonal
// hatching on the right side, tall hatched eyes with a highlight, a scribbled
// cast shadow, and a solid cut for favicon sizes. The drawing is authored on
// a 120 box and mapped to the 64 viewBox. Jitter is seeded, so the output is
// the same on every run. It writes the art data and the static icon:
//   npm run brand:draw
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import {
  crossings,
  ellipseSpan,
  emit,
  num,
  parsePath,
  radians,
  sample,
  seeded,
  subtract,
} from "./brand-mark-geometry.mjs";

const BODY =
  "M22 96C20 82 20 66 23 54C27 34 42 22 60 22C78 22 93 34 97 54C100 66 100 82 98 96Q85.3 110 72.7 94Q60 110 47.3 94Q34.7 110 22 96Z";
const EYES = [
  { c: [48, 57], rx: 5.6, ry: 8.5 },
  { c: [72, 57], rx: 5.6, ry: 8.5 },
];
const DOT_R = 1.8;
const HATCH_ANGLE = -38;
// The drawing maps a little smaller than the pencil weight, so the ghost
// keeps a margin inside the app tile while its lines stay as firm.
const SCALE = 0.58;
const LINE_SCALE = 0.6;
const tx = ([x, y]) => [(x - 60) * SCALE + 32, (y - 67) * SCALE + 32];

const rand = seeded(20261119);
const between = (min, max) => min + (max - min) * rand();
const jitter = (cmds, amp, [ox, oy] = [0, 0]) =>
  cmds.map(({ c, pts }) => ({
    c,
    pts: pts.map(([x, y]) => [
      x + ox + between(-amp, amp),
      y + oy + between(-amp, amp),
    ]),
  }));

const body = parsePath(BODY);
const poly = sample(body);
const stroke = (d, width, opacity) => ({
  d,
  width: Math.round(width * LINE_SCALE * 100) / 100,
  opacity,
});

function strokes(cmds) {
  return emit(cmds, tx);
}
function line(a, b, bow = 0.6) {
  const mid = [
    (a[0] + b[0]) / 2 + between(-bow, bow),
    (a[1] + b[1]) / 2 + between(-bow, bow),
  ];
  return `M${a.map(num)}Q${mid.map(num)} ${b.map(num)}`;
}

/** Firm outline, then a lighter second pass over the left side and dome. */
function outline() {
  const first = jitter(body, 0.35);
  const left = body.slice(0, 5);
  const second = jitter(left, 0.5, [-1.5, 1]);
  const startTick = line([24.5, 93.5], [19, 100.5], 0.2);
  const endTick = line([95.5, 93.5], [101, 99.5], 0.2);
  return [
    stroke(strokes(first), 3.2, 0.92),
    stroke(strokes(second), 1.3, 0.45),
    stroke(strokes(parsePath(startTick)), 2.6, 0.8),
    stroke(strokes(parsePath(endTick)), 2.6, 0.8),
  ];
}

/** Hatching at -38 degrees on the right of the body, kept off the eyes. */
function bodyHatch() {
  const a = radians(HATCH_ANGLE);
  const dir = [Math.cos(a), Math.sin(a)];
  const normal = [-dir[1], dir[0]];
  const pad = 2.8;
  let d = "";
  for (let o = -60; o <= 70; o += 3.1) {
    const origin = [60 + normal[0] * o, 64 + normal[1] * o];
    const hits = crossings(poly, origin, dir);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const [t0, t1] = [hits[i] + pad, hits[i + 1] - pad];
      if (t1 - t0 < 3) continue;
      // Keep the part of the chord right of x = 74.
      const tx0 = (74 - origin[0]) / dir[0];
      const lo = Math.max(t0, tx0);
      const cuts = EYES.map((e) =>
        ellipseSpan(origin, dir, e.c, e.rx + 2.2, e.ry + 2.2),
      );
      for (const [s, e] of subtract([lo, t1], cuts)) {
        if (e - s < 2.5) continue;
        const [s2, e2] = [s + between(0, 1.2), e - between(0, 1.2)];
        const at = (t) => [origin[0] + dir[0] * t, origin[1] + dir[1] * t];
        d += strokes(parsePath(line(at(s2), at(e2), 0.35)));
      }
    }
  }
  return stroke(d, 1.1, 0.4);
}

/** Two loose scribbles of cast shadow under the hem. */
function castShadow() {
  const d =
    strokes(parsePath(line([32, 108.5], [88, 108], 0.8))) +
    strokes(parsePath(line([42, 113.5], [78, 113.2], 0.8)));
  return stroke(d, 1.4, 0.28);
}

function ellipsePath({ c, rx, ry }) {
  const [x, y] = c;
  return (
    `M${[x - rx, y].map(num)}A${num(rx)} ${num(ry)} 0 1 1 ${[x + rx, y].map(num)}` +
    `A${num(rx)} ${num(ry)} 0 1 1 ${[x - rx, y].map(num)}Z`
  );
}
const scaleEllipse = (e, grow = 0) => ({
  c: tx(e.c),
  rx: (e.rx + grow) * SCALE,
  ry: (e.ry + grow) * SCALE,
});

/** An eye: dense hatching around a paper highlight, plus its outline. */
function eye(e) {
  const a = radians(-62);
  const dir = [Math.cos(a), Math.sin(a)];
  const normal = [-dir[1], dir[0]];
  const dot = [e.c[0] + 2.2, e.c[1] - 4.3];
  let d = "";
  for (let o = -10; o <= 10; o += 1.35) {
    const origin = [e.c[0] + normal[0] * o, e.c[1] + normal[1] * o];
    const span = ellipseSpan(origin, dir, e.c, e.rx - 0.7, e.ry - 0.7);
    if (!span) continue;
    const dotSpan = ellipseSpan(origin, dir, dot, DOT_R + 0.45, DOT_R + 0.45);
    for (const [s, t] of subtract(span, [dotSpan])) {
      if (t - s < 0.8) continue;
      const at = (u) => [origin[0] + dir[0] * u, origin[1] + dir[1] * u];
      d += strokes(parsePath(line(at(s), at(t), 0.15)));
    }
  }
  const wobbled = { ...e, c: [e.c[0] + between(-0.2, 0.2), e.c[1]] };
  return [
    stroke(d, 0.85, 0.9),
    stroke(ellipsePath(scaleEllipse(wobbled)), 1.2, 0.88),
  ];
}

/** The solid cut: the silhouette with the eyes punched out (even-odd). */
function solidCut() {
  const holes = EYES.map((e) => ellipsePath(scaleEllipse(e, 0.8))).join("");
  return emit(body, tx) + holes;
}

const art = {
  shadow: [castShadow()],
  hatch: [bodyHatch()],
  ink: outline(),
  eyes: EYES.flatMap(eye),
  solid: solidCut(),
};

const root = new URL("../", import.meta.url);
const artFile = fileURLToPath(
  new URL("src/shared/brand/brand-mark-art.ts", root),
);
const source = `// Generated by scripts/draw-brand-mark.mjs, not hand-edited. The Open Bot mark:
// the ghost head sketched in graphite pencil on a 0 0 64 64 viewBox, plus a
// solid cut for 32 and 16 px. The pencil colour is applied by brand-mark-layers.ts.

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
