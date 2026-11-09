export type AvatarShape =
  | "hexagon"
  | "square"
  | "circle"
  | "octagon"
  | "diamond"
  | "triangle"
  | "pentagon"
  | "egg"
  | "cloud";

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
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export const AVATAR_SHAPES: readonly AvatarShape[] = [
  "hexagon",
  "square",
  "circle",
  "octagon",
  "diamond",
  "triangle",
  "pentagon",
  "egg",
  "cloud",
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

export const DEFAULT_BOT: BotProfile = {
  id: "chief-of-staff",
  name: "Chief of Staff",
  title: "Manager & Orquestrador",
  description:
    "Você é o Chief of Staff, o coordenador geral da equipe de bots. Seu papel é planejar, sintetizar informações de repositórios/calendário e coordenar/delegar tarefas para bots especialistas quando necessário.",
  avatarShape: "hexagon",
  avatarColor: "teal",
  skills: ["github", "calendar", "summary"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/** Shapes stored by older versions, mapped onto the current art shapes. */
export const LEGACY_SHAPES: Readonly<Record<string, AvatarShape>> = {
  head: "circle",
  hex: "hexagon",
  tablet: "square",
  gem: "pentagon",
  shield: "octagon",
  wedge: "triangle",
  pebble: "circle",
  capsule: "egg",
  cloud: "cloud",
  egg: "egg",
};
