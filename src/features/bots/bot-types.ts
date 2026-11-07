export type AvatarShape =
  | "hex"
  | "tablet"
  | "gem"
  | "shield"
  | "cloud"
  | "wedge"
  | "pebble"
  | "capsule"
  | "egg";

export type AvatarColor =
  | "black"
  | "blue"
  | "cyan"
  | "red"
  | "green"
  | "yellow"
  | "orange"
  | "violet"
  | "magenta";

export interface BotProfile {
  id: string;
  name: string;
  title?: string;
  description: string;
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export const AVATAR_SHAPES: readonly AvatarShape[] = [
  "hex",
  "tablet",
  "gem",
  "shield",
  "cloud",
  "wedge",
  "pebble",
  "capsule",
  "egg",
] as const;

export const AVATAR_COLORS: readonly AvatarColor[] = [
  "cyan",
  "blue",
  "violet",
  "magenta",
  "green",
  "yellow",
  "orange",
  "red",
  "black",
] as const;

export const DEFAULT_BOT: BotProfile = {
  id: "default",
  name: "OpenBot",
  title: "Assistente Geral",
  description:
    "Você é o OpenBot, um assistente rápido, conciso e prestativo com suporte a ferramentas do GitHub e Agenda.",
  avatarShape: "hex",
  avatarColor: "cyan",
  skills: ["github", "calendar", "summary"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
