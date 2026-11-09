import {
  AVATAR_COLORS,
  AVATAR_SHAPES,
  DEFAULT_BOT,
  type AvatarColor,
  type AvatarShape,
  type BotProfile,
} from "./bot-types.ts";
import { CREW_PRESETS } from "./crew-presets.ts";

export const BOTS_STORAGE_KEY = "openbot_bots";
export const ACTIVE_BOT_STORAGE_KEY = "openbot_active_bot_id";

function isValidShape(val: unknown): val is AvatarShape {
  return (
    typeof val === "string" &&
    (AVATAR_SHAPES as readonly string[]).includes(val)
  );
}

function isValidColor(val: unknown): val is AvatarColor {
  return (
    typeof val === "string" &&
    (AVATAR_COLORS as readonly string[]).includes(val)
  );
}

export function sanitizeBotProfile(raw: unknown): BotProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== "string" || !obj.id.trim()) return null;
  if (typeof obj.name !== "string" || !obj.name.trim()) return null;

  const rawId = obj.id.trim();
  const rawName = obj.name.trim();

  // Canonical upgrade for legacy default bot
  const isLegacyDefault =
    rawId === "default" ||
    (rawId === "chief-of-staff" && rawName === "OpenBot") ||
    rawName === "OpenBot";

  const id = isLegacyDefault ? DEFAULT_BOT.id : rawId;
  const name = isLegacyDefault ? DEFAULT_BOT.name : rawName;
  const title = isLegacyDefault
    ? DEFAULT_BOT.title
    : typeof obj.title === "string"
      ? obj.title.trim()
      : undefined;

  const shape: AvatarShape = isValidShape(obj.avatarShape)
    ? isLegacyDefault &&
      (obj.avatarShape === "hex" || obj.avatarShape === "shield")
      ? DEFAULT_BOT.avatarShape
      : obj.avatarShape
    : isLegacyDefault
      ? DEFAULT_BOT.avatarShape
      : "hex";

  const color: AvatarColor = isValidColor(obj.avatarColor)
    ? isLegacyDefault && obj.avatarColor === "cyan"
      ? DEFAULT_BOT.avatarColor
      : obj.avatarColor
    : isLegacyDefault
      ? DEFAULT_BOT.avatarColor
      : "cyan";

  const skills = Array.isArray(obj.skills)
    ? obj.skills.filter(
        (s): s is string => typeof s === "string" && Boolean(s.trim()),
      )
    : ["github", "calendar", "summary"];

  return {
    id,
    name,
    title,
    description:
      typeof obj.description === "string" &&
      obj.description.trim() &&
      !obj.description.includes("Você é o OpenBot, um assistente rápido")
        ? obj.description.trim()
        : DEFAULT_BOT.description,
    avatarShape: shape,
    avatarColor: color,
    skills,
    createdAt:
      typeof obj.createdAt === "string"
        ? obj.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof obj.updatedAt === "string"
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}

const DEFAULT_BOTS_LIST: BotProfile[] = [...CREW_PRESETS];
let cachedBotsRaw: string | null = null;
let cachedBots: BotProfile[] = DEFAULT_BOTS_LIST;
let botListeners: Array<() => void> = [];

let cachedActiveIdRaw: string | null = null;
let cachedActiveId = DEFAULT_BOT.id;
let activeBotListeners: Array<() => void> = [];

export function subscribeBots(listener: () => void): () => void {
  botListeners.push(listener);
  return () => {
    botListeners = botListeners.filter((l) => l !== listener);
  };
}

export function subscribeActiveBotId(listener: () => void): () => void {
  activeBotListeners.push(listener);
  return () => {
    activeBotListeners = activeBotListeners.filter((l) => l !== listener);
  };
}

export function loadBotsFromStorage(storage?: Storage): BotProfile[] {
  try {
    const isDefaultStorage = !storage;
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return DEFAULT_BOTS_LIST;

    const raw = s.getItem(BOTS_STORAGE_KEY);
    if (!raw) {
      if (isDefaultStorage) {
        cachedBotsRaw = null;
        cachedBots = DEFAULT_BOTS_LIST;
      }
      return DEFAULT_BOTS_LIST;
    }
    if (isDefaultStorage && raw === cachedBotsRaw) return cachedBots;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BOTS_LIST;

    const sanitized = parsed
      .map(sanitizeBotProfile)
      .filter((b): b is BotProfile => b !== null);

    const result = sanitized.length > 0 ? sanitized : DEFAULT_BOTS_LIST;
    if (isDefaultStorage) {
      cachedBotsRaw = raw;
      cachedBots = result;
    }
    return result;
  } catch {
    return DEFAULT_BOTS_LIST;
  }
}

export function saveBotsToStorage(bots: BotProfile[], storage?: Storage): void {
  try {
    const isDefaultStorage = !storage;
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return;
    const raw = JSON.stringify(bots);
    s.setItem(BOTS_STORAGE_KEY, raw);
    if (isDefaultStorage) {
      cachedBotsRaw = raw;
      cachedBots = bots;
      botListeners.forEach((l) => l());
    }
  } catch {
    // ignore
  }
}

export function loadActiveBotId(storage?: Storage): string {
  try {
    const isDefaultStorage = !storage;
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return DEFAULT_BOT.id;
    const raw = s.getItem(ACTIVE_BOT_STORAGE_KEY);
    const normalized = raw === "default" ? DEFAULT_BOT.id : raw;
    if (isDefaultStorage && normalized === cachedActiveIdRaw)
      return cachedActiveId;
    const result = normalized || DEFAULT_BOT.id;
    if (isDefaultStorage) {
      cachedActiveIdRaw = normalized;
      cachedActiveId = result;
    }
    return result;
  } catch {
    return DEFAULT_BOT.id;
  }
}

export function saveActiveBotId(id: string, storage?: Storage): void {
  try {
    const isDefaultStorage = !storage;
    const s =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!s) return;
    s.setItem(ACTIVE_BOT_STORAGE_KEY, id);
    if (isDefaultStorage) {
      cachedActiveIdRaw = id;
      cachedActiveId = id;
      activeBotListeners.forEach((l) => l());
    }
  } catch {
    // ignore
  }
}

export function createBotProfile(input: {
  name: string;
  title?: string;
  description?: string;
  avatarShape?: AvatarShape;
  avatarColor?: AvatarColor;
  skills?: string[];
}): BotProfile {
  const now = new Date().toISOString();
  const id = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    name: input.name.trim() || "Novo Bot",
    title: input.title?.trim() || undefined,
    description:
      input.description?.trim() ||
      "Você é um assistente prestativo e especializado.",
    avatarShape: input.avatarShape ?? "hex",
    avatarColor: input.avatarColor ?? "cyan",
    skills: input.skills ?? ["github", "calendar", "summary"],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBotInList(
  bots: BotProfile[],
  updated: BotProfile,
): BotProfile[] {
  const index = bots.findIndex((b) => b.id === updated.id);
  if (index === -1) return [...bots, updated];
  const copy = [...bots];
  copy[index] = { ...updated, updatedAt: new Date().toISOString() };
  return copy;
}

export function deleteBotFromList(
  bots: BotProfile[],
  idToDelete: string,
): { bots: BotProfile[]; newActiveId?: string } {
  if (bots.length <= 1) {
    return { bots };
  }
  const nextBots = bots.filter((b) => b.id !== idToDelete);
  return {
    bots: nextBots,
    newActiveId: nextBots[0]?.id,
  };
}
