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

/** Coloured-pencil pigments: Open Bot's own palette for the crew heads. */
export type AvatarColor =
  | "vermilion"
  | "sienna"
  | "ochre"
  | "sap"
  | "viridian"
  | "cerulean"
  | "cobalt"
  | "mauve"
  | "rose"
  | "graphite";

export interface BotProfile {
  id: string;
  name: string;
  title?: string;
  description: string;
  workspaceContext?: string;
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

/** Picker order: warm to cool around the wheel, then the neutral. */
export const AVATAR_COLORS: readonly AvatarColor[] = [
  "vermilion",
  "sienna",
  "ochre",
  "sap",
  "viridian",
  "cerulean",
  "cobalt",
  "mauve",
  "rose",
  "graphite",
] as const;

export const DEFAULT_BOT: BotProfile = {
  id: "chief-of-staff",
  name: "Chief of Staff",
  title: "Manager & Orquestrador",
  description:
    "Você é o Chief of Staff, o coordenador geral da equipe de bots. Seu papel é planejar, sintetizar informações de repositórios/calendário e coordenar/delegar tarefas para bots especialistas quando necessário.",
  avatarShape: "hexagon",
  avatarColor: "viridian",
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
  shield: "octagon",
  wedge: "triangle",
  pebble: "circle",
  capsule: "egg",
  cloud: "cloud",
  egg: "egg",
};

/** Colours stored by older versions, mapped onto the nearest pigment. */
export const LEGACY_COLORS: Readonly<Record<string, AvatarColor>> = {
  cyan: "cerulean",
  sky: "cerulean",
  blue: "cobalt",
  violet: "mauve",
  magenta: "rose",
  pink: "rose",
  red: "vermilion",
  orange: "sienna",
  yellow: "ochre",
  gold: "ochre",
  green: "sap",
  teal: "viridian",
  black: "graphite",
};
