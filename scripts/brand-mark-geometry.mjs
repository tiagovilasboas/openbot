// Geometry helpers for scripts/draw-brand-mark.mjs: path parsing, sampling,
// hatching by chords, and deterministic jitter. The generator is seeded, so
// the drawing is identical on every run; nothing here runs in the app.

export function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const num = (v) => {
  const s = String(Math.round(v * 100) / 100);
  return s === "-0" ? "0" : s;
};
export const radians = (deg) => (deg * Math.PI) / 180;

/** Absolute M/C/Q/Z paths into [{ c, pts }] commands. */
export function parsePath(d) {
  const out = [];
  for (const [, c, args] of d.matchAll(/([MCQZ])([^MCQZ]*)/g)) {
    const n = args.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const pts = [];
    for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    out.push({ c, pts });
  }
  return out;
}

/** Commands back to a path string, mapping every point through `tx`. */
export function emit(cmds, tx = (p) => p) {
  return cmds
    .map(({ c, pts }) => {
      const body = pts.map((p) => tx(p).map(num).join(" ")).join(" ");
      return c + body;
    })
    .join("");
}

/** The outline as a dense polygon, for crossing tests. */
export function sample(cmds, per = 16) {
  const poly = [];
  let at = [0, 0];
  for (const { c, pts } of cmds) {
    if (c === "M") at = pts[0];
    if (c !== "C" && c !== "Q") continue;
    const ctrl = [at, ...pts];
    for (let i = 1; i <= per; i++) {
      const t = i / per;
      let q = ctrl;
      while (q.length > 1) {
        q = q
          .slice(1)
          .map((p, j) => [
            q[j][0] + (p[0] - q[j][0]) * t,
            q[j][1] + (p[1] - q[j][1]) * t,
          ]);
      }
      poly.push(q[0]);
    }
    at = pts[pts.length - 1];
  }
  return poly;
}

/** Parameters t at which the line origin + t * dir crosses the polygon. */
export function crossings(poly, origin, [dx, dy]) {
  const hits = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const [ex, ey] = [bx - ax, by - ay];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const [px, py] = [ax - origin[0], ay - origin[1]];
    const t = (px * ey - py * ex) / den;
    const u = (px * dy - py * dx) / den;
    if (u >= 0 && u < 1) hits.push(t);
  }
  return hits.sort((a, b) => a - b);
}

/** The t interval where a line is inside an ellipse, or null. */
export function ellipseSpan(origin, [dx, dy], [cx, cy], rx, ry) {
  const [px, py] = [(origin[0] - cx) / rx, (origin[1] - cy) / ry];
  const [qx, qy] = [dx / rx, dy / ry];
  const a = qx * qx + qy * qy;
  const b = 2 * (px * qx + py * qy);
  const disc = b * b - 4 * a * (px * px + py * py - 1);
  if (disc <= 0) return null;
  const root = Math.sqrt(disc);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}

/** Remove the spans in `cuts` from the interval [lo, hi]. */
export function subtract([lo, hi], cuts) {
  let parts = [[lo, hi]];
  for (const cut of cuts) {
    if (!cut) continue;
    parts = parts.flatMap(([a, b]) => {
      if (cut[1] <= a || cut[0] >= b) return [[a, b]];
      return [
        ...(cut[0] > a ? [[a, cut[0]]] : []),
        ...(cut[1] < b ? [[cut[1], b]] : []),
      ];
    });
  }
  return parts;
}
