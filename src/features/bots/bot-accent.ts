import type { AvatarColor } from "./bot-types.ts";

/*
 * One accent per pigment, tuned for the graphite ground: every value clears
 * 4.5:1 against --background, so it works for focus rings, the caret,
 * selection and small accent text. Each keeps its pigment's hue, lifted in
 * lightness; graphite stays a light neutral that still reads on the ground.
 */
const BOT_ACCENTS: Record<AvatarColor, string> = {
  vermilion: "oklch(0.74 0.15 31)",
  sienna: "oklch(0.74 0.14 45)",
  ochre: "oklch(0.83 0.13 83)",
  sap: "oklch(0.77 0.15 132)",
  viridian: "oklch(0.74 0.11 175)",
  cerulean: "oklch(0.77 0.12 233)",
  cobalt: "oklch(0.74 0.13 264)",
  mauve: "oklch(0.74 0.14 304)",
  rose: "oklch(0.75 0.15 359)",
  graphite: "oklch(0.8 0.01 267)",
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

/** The accent for a bot color; unknown (legacy) colors fall back to cerulean. */
export function botAccent(color: AvatarColor): string {
  return BOT_ACCENTS[color] ?? BOT_ACCENTS.cerulean;
}

/** Edge and two-stop body fill for an avatar, derived from its accent. */
export function botAvatarTones(color: AvatarColor): BotAvatarTones {
  const accent = botAccent(color);
  const mix = color === "graphite" ? AVATAR_MIX.graphite : AVATAR_MIX.bright;
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
