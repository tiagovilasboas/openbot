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
  workspaceContext?: string;
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
  id: "chief-of-staff",
  name: "Chief of Staff",
  title: "Manager & Orquestrador",
  description:
    "Você é o Chief of Staff, o coordenador geral da equipe de bots. Seu papel é planejar, sintetizar informações de repositórios/calendário e coordenar/delegar tarefas para bots especialistas quando necessário.",
  avatarShape: "shield",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
