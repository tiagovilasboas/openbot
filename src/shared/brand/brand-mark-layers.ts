import { BRAND_MARK_ART } from "./brand-mark-art.ts";

/**
 * The pencil: one graphite tone, pressed harder or softer (width and opacity).
 * Dark graphite on a light ground, silver graphite on a dark one.
 */
export const GRAPHITE = { onLight: "#3A3B3F", onDark: "#D2D4D8" } as const;

export const TILE_COLOR = "#191a1f";

export interface BrandMarkOptions {
  /** "rounded" draws the app tile behind the sketch; "none" keeps it clear. */
  tile: "rounded" | "none";
  /** "solid" is the favicon cut: a filled silhouette with the eyes punched out. */
  cut?: "line" | "solid";
  /** Outline multiplier, so the head keeps a ~1 px outline when small. */
  weight?: number;
  /** Pencil colour; without it the sketch draws in currentColor. */
  ink?: string;
}

/**
 * The static icon in public/ (favicon, manifest): clear ground, pencil that
 * follows the viewer's light or dark scheme.
 */
export const STATIC_ICON: BrandMarkOptions = {
  tile: "none",
};

export interface SvgNode {
  tag: "rect" | "path";
  attrs: Record<string, string | number>;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function pencil(d: string, ink: string, width: number, opacity: number) {
  return {
    tag: "path" as const,
    attrs: {
      d,
      fill: "none",
      stroke: ink,
      strokeWidth: round(width),
      strokeOpacity: opacity,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
  };
}

/** The sketch as plain SVG nodes, shared by React, the static icon and the PNGs. */
export function brandMarkLayers(options: BrandMarkOptions): SvgNode[] {
  const art = BRAND_MARK_ART;
  const ink = options.ink ?? "currentColor";
  const weight = options.weight ?? 1;
  const shading = 1 + (weight - 1) * 0.4;
  const nodes: SvgNode[] = [];
  if (options.tile === "rounded") {
    nodes.push({
      tag: "rect",
      attrs: { width: 64, height: 64, rx: 19, fill: TILE_COLOR },
    });
  }
  if (options.cut === "solid") {
    nodes.push({
      tag: "path",
      attrs: { d: art.solid, fill: ink, fillRule: "evenodd" },
    });
    return nodes;
  }
  for (const s of art.shadow) {
    nodes.push(pencil(s.d, ink, s.width * shading, s.opacity));
  }
  for (const h of art.hatch) {
    nodes.push(pencil(h.d, ink, h.width * shading, h.opacity));
  }
  for (const i of art.ink) {
    nodes.push(pencil(i.d, ink, i.width * weight, i.opacity));
  }
  for (const e of art.eyes) {
    nodes.push(pencil(e.d, ink, e.width * shading, e.opacity));
  }
  return nodes;
}

function attributeName(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

// A standalone file has no parent to inherit currentColor from, so it picks
// the graphite for the viewer's scheme itself.
const SCHEME_STYLE =
  `  <style>svg{color:${GRAPHITE.onLight}}` +
  `@media (prefers-color-scheme:dark){svg{color:${GRAPHITE.onDark}}}</style>\n`;

/** A standalone SVG document of the sketch. */
export function brandMarkSvg(options: BrandMarkOptions): string {
  const body = brandMarkLayers(options)
    .map(({ tag, attrs }) => {
      const list = Object.entries(attrs)
        .map(([key, value]) => `${attributeName(key)}="${value}"`)
        .join(" ");
      return `  <${tag} ${list}/>`;
    })
    .join("\n");
  const style = options.ink ? "" : SCHEME_STYLE;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n${style}${body}\n</svg>\n`;
}
