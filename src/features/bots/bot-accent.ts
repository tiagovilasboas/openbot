import type { AvatarColor } from "./bot-types.ts";

/*
 * One accent per avatar color, tuned for the graphite ground: every value
 * clears 4.5:1 against --background, so it works for focus rings, the caret,
 * selection and small accent text. "black" is a dark bot, so its accent is a
 * light graphite that still reads on the dark ground.
 */
const BOT_ACCENTS: Record<AvatarColor, string> = {
  cyan: "oklch(0.8 0.12 212)",
  blue: "oklch(0.72 0.14 256)",
  violet: "oklch(0.72 0.15 292)",
  magenta: "oklch(0.74 0.18 332)",
  green: "oklch(0.78 0.15 158)",
  yellow: "oklch(0.86 0.14 92)",
  orange: "oklch(0.78 0.15 58)",
  red: "oklch(0.7 0.18 24)",
  black: "oklch(0.82 0.01 264)",
};

/* Share of the accent mixed into the ground for the avatar body. */
const AVATAR_MIX = {
  bright: { edge: 100, top: 92, bottom: 58 },
  graphite: { edge: 58, top: 34, bottom: 20 },
} as const;

export interface BotAvatarTones {
  accent: string;
  edge: string;
  top: string;
  bottom: string;
}

/** The accent for a bot color; unknown (legacy) colors fall back to cyan. */
export function botAccent(color: AvatarColor): string {
  return BOT_ACCENTS[color] ?? BOT_ACCENTS.cyan;
}

/** Edge and two-stop body fill for an avatar, derived from its accent. */
export function botAvatarTones(color: AvatarColor): BotAvatarTones {
  const accent = botAccent(color);
  const mix = color === "black" ? AVATAR_MIX.graphite : AVATAR_MIX.bright;
  const toward = (share: number) =>
    share >= 100
      ? accent
      : `color-mix(in oklab, ${accent} ${share}%, var(--background))`;

  return {
    accent,
    edge: toward(mix.edge),
    top: toward(mix.top),
    bottom: toward(mix.bottom),
  };
}
