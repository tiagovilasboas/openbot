import { BRAND_MARK_ART } from "./brand-mark-art.ts";

/**
 * Graphite tones for the head, mixed the way the crew heads mix theirs (light
 * is the base 35% toward white, dark 22% and shade 35% toward black), with the
 * crew's light outline and dark eyes. No colour: it is a pencil drawing.
 */
export const GRAPHITE = {
  base: "#8B8E95",
  light: "#B3B5BA",
  dark: "#6C6F74",
  shade: "#5A5C61",
  ink: "#E5E5E5",
  guide: "#5A5A5A",
  eyes: "#0A0A0A",
} as const;

export const TILE_COLOR = "#191a1f";

export interface BrandMarkOptions {
  /** "rounded" draws the app tile behind the head; "none" leaves it out. */
  tile: "rounded" | "none";
  /** Construction lines: worth it at icon sizes, noise at 28 px. */
  guides: boolean;
  /** Outline multiplier, so the head keeps a ~1 px outline when small. */
  weight?: number;
  tileFill?: string;
  tileClassName?: string;
}

/** The static icon in public/ (favicon, manifest, lock screen). */
export const STATIC_ICON: BrandMarkOptions = {
  tile: "rounded",
  guides: true,
  weight: 1.3,
  tileFill: TILE_COLOR,
};

export interface SvgNode {
  tag: "rect" | "path";
  attrs: Record<string, string | number>;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function stroke(d: string, color: string, width: number, opacity: number) {
  return {
    tag: "path" as const,
    attrs: {
      d,
      fill: "none",
      stroke: color,
      strokeWidth: round(width),
      strokeOpacity: opacity,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
  };
}

function tilePaint(options: BrandMarkOptions): Record<string, string> {
  return options.tileClassName
    ? { className: options.tileClassName }
    : { fill: options.tileFill ?? TILE_COLOR };
}

/** The mark as plain SVG nodes, shared by React, the static icon and the PNGs. */
export function brandMarkLayers(options: BrandMarkOptions): SvgNode[] {
  const art = BRAND_MARK_ART;
  const weight = options.weight ?? 1;
  const hatchWeight = 1 + (weight - 1) * 0.4;
  const nodes: SvgNode[] = [];
  if (options.tile === "rounded") {
    nodes.push({
      tag: "rect",
      attrs: { width: 64, height: 64, rx: 19, ...tilePaint(options) },
    });
  }
  if (options.guides) {
    for (const g of art.guides) {
      nodes.push(stroke(g.d, GRAPHITE.guide, g.width, g.opacity));
    }
  }
  nodes.push({ tag: "path", attrs: { d: art.body, fill: GRAPHITE.base } });
  for (const h of art.hatch) {
    nodes.push(stroke(h.d, GRAPHITE[h.tone], h.width * hatchWeight, h.opacity));
  }
  for (const i of art.ink) {
    nodes.push(stroke(i.d, GRAPHITE.ink, i.width * weight, i.opacity));
  }
  for (const e of art.eyes) {
    nodes.push({
      tag: "path",
      attrs: {
        d: e.d,
        fill: GRAPHITE.eyes,
        fillOpacity: e.fillOpacity,
        stroke: GRAPHITE.eyes,
        strokeOpacity: 0.7,
        strokeWidth: 0.6,
      },
    });
  }
  return nodes;
}

function attributeName(key: string): string {
  if (key === "className") return "class";
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** A standalone SVG document of the mark. */
export function brandMarkSvg(options: BrandMarkOptions): string {
  const body = brandMarkLayers(options)
    .map(({ tag, attrs }) => {
      const list = Object.entries(attrs)
        .map(([key, value]) => `${attributeName(key)}="${value}"`)
        .join(" ");
      return `  <${tag} ${list}/>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n${body}\n</svg>\n`;
}
