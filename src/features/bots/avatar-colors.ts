import type { AvatarColor } from "./bot-types.ts";

/** Coloured-pencil pigment for each avatar colour (also used by the pickers). */
export const COLOR_MAP: Record<AvatarColor, string> = {
  vermilion: "#E04A33",
  sienna: "#CF6E3F",
  ochre: "#D8A63C",
  sap: "#74AD3F",
  viridian: "#35A58C",
  cerulean: "#3AA6D9",
  cobalt: "#4C78D6",
  mauve: "#9C72CC",
  rose: "#DB6A93",
  // The graphite of the Open Bot mark: a mid grey, never pure black.
  graphite: "#8B8E95",
};

const EYES = "#0A0A0A";

export interface HeadTones {
  base: string;
  light: string;
  dark: string;
  shade: string;
  ink: string;
  guide: string;
  eyes: string;
}

// Runtime tokens for the dark UI (the default): graphite ink and construction.
export const INK_DARK = "#E5E5E5";
export const INK_LIGHT = "#2A2A2A";
export const GUIDE_COLOR = "#5A5A5A";
export const GUIDE_OPACITY = 0.85;

/** Blend hex toward another hex by k (0 = hex, 1 = other). */
export function mix(hex: string, other: string, k: number): string {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(other.slice(i, i + 2), 16));
  return `#${a
    .map((x, i) =>
      Math.round(x + (b[i]! - x) * k)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase(),
    )
    .join("")}`;
}

/** The pigment for a colour; unknown (legacy) colours fall back to cerulean. */
export function avatarSwatch(color: AvatarColor): string {
  return COLOR_MAP[color] ?? COLOR_MAP.cerulean;
}

export function headTones(color: AvatarColor, light = false): HeadTones {
  const base = avatarSwatch(color);
  return {
    base,
    light: mix(base, "#FFFFFF", 0.35),
    dark: mix(base, "#000000", 0.22),
    shade: mix(base, "#000000", 0.35),
    ink: light ? INK_LIGHT : INK_DARK,
    guide: GUIDE_COLOR,
    eyes: EYES,
  };
}

/** Stroke multiplier so the outline stays about 1px wide at small sizes. */
export function strokeBoost(size: number | string): number {
  if (typeof size !== "number") return 2;
  return Math.min(2.4, Math.max(1.2, 100 / Math.max(size, 1)));
}
