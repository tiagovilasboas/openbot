import type { AvatarColor } from "./bot-types.ts";

/** Flat palette colour for each avatar colour (also used by the pickers). */
export const COLOR_MAP: Record<AvatarColor, string> = {
  cyan: "#06b6d4",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  magenta: "#d946ef",
  green: "#10b981",
  yellow: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  black: "#27272a",
  teal: "#2DD4BF",
  sky: "#0EA5E9",
  pink: "#EC4899",
  gold: "#EAB308",
};

// Never pure black or white heads (avoids the xAI logo look): "black" is a
// dark grey head with light eyes.
const BLACK_HEAD = "#3F3F46";
const DARK_EYES = "#0A0A0A";
const LIGHT_EYES = "#F5F5F5";

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

export function avatarSwatch(color: AvatarColor): string {
  return COLOR_MAP[color] ?? COLOR_MAP.cyan;
}

export function headTones(color: AvatarColor, light = false): HeadTones {
  const isBlack = color === "black";
  const base = isBlack ? BLACK_HEAD : avatarSwatch(color);
  return {
    base,
    light: mix(base, "#FFFFFF", 0.35),
    dark: mix(base, "#000000", 0.22),
    shade: mix(base, "#000000", 0.35),
    ink: light ? INK_LIGHT : INK_DARK,
    guide: GUIDE_COLOR,
    eyes: isBlack ? LIGHT_EYES : DARK_EYES,
  };
}

/** Stroke multiplier so the outline stays about 1px wide at small sizes. */
export function strokeBoost(size: number | string): number {
  if (typeof size !== "number") return 2;
  return Math.min(2.4, Math.max(1.2, 100 / Math.max(size, 1)));
}
