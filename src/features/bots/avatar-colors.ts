import type { AvatarColor } from "./bot-types.ts";

/** Body colour for each avatar colour: bright, flat fills (also the pickers). */
export const COLOR_MAP: Record<AvatarColor, string> = {
  cyan: "#1EC8E6",
  blue: "#4D7CFF",
  violet: "#7C5CFF",
  magenta: "#C85CFF",
  green: "#38D46A",
  yellow: "#FFD43F",
  orange: "#FF7A3D",
  red: "#FF5A5F",
  black: "#5B5E69",
  teal: "#22C9A0",
  sky: "#2EA8FF",
  pink: "#FF5EA8",
  gold: "#FFAE1F",
};

/** The pencil line around every head: graphite, as in the Open Bot mark. */
export const OUTLINE = "#24242B";

// Never a pure black head (it reads as the xAI logo): "black" is a graphite
// blob, so its eyes are light and their catchlight takes the body colour.
const DARK_EYES = "#16161B";
const LIGHT_EYES = "#F5F5F5";
const CATCHLIGHT = "#FFFFFF";

export interface HeadTones {
  base: string;
  eyes: string;
  catchlight: string;
}

export function headTones(color: AvatarColor): HeadTones {
  const base = COLOR_MAP[color] ?? COLOR_MAP.cyan;
  const graphite = color === "black";
  return {
    base,
    eyes: graphite ? LIGHT_EYES : DARK_EYES,
    catchlight: graphite ? base : CATCHLIGHT,
  };
}

/** Stroke multiplier so the outline stays about 1px wide at small sizes. */
export function strokeBoost(size: number | string): number {
  if (typeof size !== "number") return 2;
  return Math.min(2.4, Math.max(1.2, 100 / Math.max(size, 1)));
}
