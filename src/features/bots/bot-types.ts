import type { SkillDefinition } from "../skills/skill-types.ts";

export type AvatarShape =
  | "hexagon"
  | "square"
  | "circle"
  | "octagon"
  | "ghost"
  | "flower"
  | "clover"
  | "dumpling"
  | "shield"
  | "triangle"
  | "pentagon"
  | "egg"
  | "cloud"
  | "star"
  | "heart"
  | "gear"
  | "cat";

export type AvatarColor =
  | "black"
  | "blue"
  | "cyan"
  | "red"
  | "green"
  | "yellow"
  | "orange"
  | "violet"
  | "magenta"
  | "teal"
  | "sky"
  | "pink"
  | "gold";

export interface BotProfile {
  id: string;
  name: string;
  title?: string;
  description: string;
  workspaceContext?: string;
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  /** Skills this bot owns: they enter its prompt and its / palette only. */
  skills: SkillDefinition[];
  createdAt: string;
  updatedAt: string;
}

export const AVATAR_SHAPES: readonly AvatarShape[] = [
  "hexagon",
  "square",
  "circle",
  "octagon",
  "ghost",
  "flower",
  "clover",
  "dumpling",
  "shield",
  "triangle",
  "pentagon",
  "egg",
  "cloud",
  "star",
  "heart",
  "gear",
  "cat",
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
  "teal",
  "sky",
  "pink",
  "gold",
] as const;

/** Longest bot name kept by the form and the sanitizer. */
export const BOT_NAME_MAX_LENGTH = 40;

export const DEFAULT_BOT: BotProfile = {
  id: "chief-of-staff",
  name: "Chief of Staff",
  title: "Manager & Orquestrador",
  description:
    "Você é o Chief of Staff, o coordenador geral da equipe de bots. Seu papel é planejar, sintetizar informações de repositórios/calendário e coordenar/delegar tarefas para bots especialistas quando necessário.",
  avatarShape: "ghost",
  avatarColor: "teal",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/** Shapes stored by older versions, mapped onto the current art shapes. */
export const LEGACY_SHAPES: Readonly<Record<string, AvatarShape>> = {
  head: "circle",
  hex: "hexagon",
  tablet: "square",
  gem: "pentagon",
  wedge: "triangle",
  pebble: "circle",
  capsule: "egg",
  // The pointed top read as a drop.
  diamond: "ghost",
  cloud: "cloud",
  egg: "egg",
};
