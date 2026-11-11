import { isLanguage } from "../language/language.ts";
import type { AttachmentSummary } from "../attachments/attachment-summary.ts";
import {
  MAX_ATTACHMENTS,
  MAX_NAME_LENGTH,
} from "../attachments/attachment-limits.ts";
import { sanitizeBotProfile } from "../bots/bot-storage.ts";
import type { BotProfile } from "../bots/bot-types.ts";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import { sanitizeCrewStep } from "../crew/crew-step-record.ts";
import {
  sanitizeMemoryEntries,
  type MemoryEntry,
} from "../memory/memory-entries.ts";
import {
  BACKUP_APP,
  BACKUP_MAX_BYTES,
  BACKUP_READABLE_VERSIONS,
  BACKUP_VERSION,
  type Backup,
  type BackupData,
  type ParseBackupResult,
} from "./backup-types.ts";

const MAX_BOTS = 100;
const MAX_MESSAGES_PER_BOT = 500;
const MAX_TEXT_LENGTH = 20_000;
const MAX_LABEL_LENGTH = 200;
const MAX_ATTACHMENTS_SCANNED = 20;
const RESERVED_IDS = new Set(["__proto__", "constructor", "prototype"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampText(value: unknown, max: number): string | undefined {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}

function sanitizeFailover(raw: unknown): MessageData["failover"] {
  if (!isRecord(raw)) return undefined;
  const { fromModel, toModel, reason } = raw;
  if (
    typeof fromModel !== "string" ||
    typeof toModel !== "string" ||
    typeof reason !== "string"
  ) {
    return undefined;
  }
  return {
    fromModel: fromModel.slice(0, MAX_LABEL_LENGTH),
    toModel: toModel.slice(0, MAX_LABEL_LENGTH),
    reason: reason.slice(0, MAX_LABEL_LENGTH),
  };
}

/** Names and sizes only; anything else a file claims is dropped. */
function sanitizeAttachments(raw: unknown): AttachmentSummary[] {
  if (!Array.isArray(raw)) return [];
  const kept: AttachmentSummary[] = [];
  for (const entry of raw.slice(0, MAX_ATTACHMENTS_SCANNED)) {
    if (kept.length >= MAX_ATTACHMENTS) break;
    if (!isRecord(entry)) continue;
    const name = clampText(entry.name, MAX_NAME_LENGTH);
    const { size } = entry;
    if (!name || typeof size !== "number" || !Number.isSafeInteger(size)) {
      continue;
    }
    if (size < 0) continue;
    kept.push({
      name,
      size,
      ...(entry.truncated === true ? { truncated: true } : {}),
    });
  }
  return kept;
}

function sanitizeMessage(raw: unknown): MessageData | null {
  if (!isRecord(raw)) return null;
  const text = clampText(raw.text, MAX_TEXT_LENGTH);
  if (text === undefined) return null;
  if (raw.role !== "user" && raw.role !== "assistant") return null;
  if (typeof raw.id !== "number" || !Number.isSafeInteger(raw.id)) return null;
  const message: MessageData = {
    id: raw.id,
    role: raw.role,
    language: isLanguage(raw.language) ? raw.language : "pt",
    text,
  };
  const badge = clampText(raw.modelBadge, MAX_LABEL_LENGTH);
  if (badge) message.modelBadge = badge;
  const failover = sanitizeFailover(raw.failover);
  if (failover) message.failover = failover;
  const delegated = raw.delegatedBot
    ? sanitizeBotProfile(raw.delegatedBot)
    : null;
  if (delegated && !RESERVED_IDS.has(delegated.id)) {
    message.delegatedBot = delegated;
  }
  const crewStep = sanitizeCrewStep(raw.crewStep);
  if (crewStep && message.delegatedBot) message.crewStep = crewStep;
  if (raw.incomplete === "error" || raw.incomplete === "cancelled") {
    message.incomplete = raw.incomplete;
  }
  const attachments = sanitizeAttachments(raw.attachments);
  if (attachments.length > 0) message.attachments = attachments;
  return message;
}

function sanitizeBots(raw: unknown): BotProfile[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_BOTS) return null;
  const seen = new Set<string>();
  const bots: BotProfile[] = [];
  for (const entry of raw) {
    const bot = sanitizeBotProfile(entry);
    if (!bot || RESERVED_IDS.has(bot.id) || seen.has(bot.id)) continue;
    seen.add(bot.id);
    bots.push(bot);
  }
  return bots.length > 0 ? bots : null;
}

function sanitizeMessages(
  raw: unknown,
  botIds: Set<string>,
): Record<string, MessageData[]> {
  const messages: Record<string, MessageData[]> = Object.create(null);
  if (!isRecord(raw)) return messages;
  for (const key of Object.keys(raw)) {
    // Legacy ids (such as "default") map to the id their bot now has.
    const id = sanitizeBotProfile({ id: key, name: "x" })?.id ?? key;
    const list = raw[key];
    if (!botIds.has(id) || !Array.isArray(list)) continue;
    const kept = list
      .map(sanitizeMessage)
      .filter((m): m is MessageData => m !== null)
      .slice(-MAX_MESSAGES_PER_BOT);
    if (kept.length > 0) messages[id] = kept;
  }
  return messages;
}

function sanitizeMemory(
  raw: unknown,
  botIds: Set<string>,
): Record<string, MemoryEntry[]> {
  const memory: Record<string, MemoryEntry[]> = Object.create(null);
  if (!isRecord(raw)) return memory;
  for (const key of Object.keys(raw)) {
    const id = sanitizeBotProfile({ id: key, name: "x" })?.id ?? key;
    if (!botIds.has(id) || RESERVED_IDS.has(id)) continue;
    const notes = sanitizeMemoryEntries(raw[key]);
    if (notes.length > 0) memory[id] = notes;
  }
  return memory;
}

function knownId(value: unknown, ids: Set<string>): string | undefined {
  return typeof value === "string" && ids.has(value) ? value : undefined;
}

function sanitizeData(raw: unknown): BackupData | null {
  if (!isRecord(raw)) return null;
  const bots = sanitizeBots(raw.bots);
  if (!bots) return null;
  const ids = new Set(bots.map((bot) => bot.id));
  const activeBotId = knownId(raw.activeBotId, ids);
  const mainBotId = knownId(raw.mainBotId, ids);
  return {
    bots,
    ...(activeBotId ? { activeBotId } : {}),
    ...(mainBotId ? { mainBotId } : {}),
    ...(isLanguage(raw.language) ? { language: raw.language } : {}),
    messages: sanitizeMessages(raw.messages, ids),
    memory: sanitizeMemory(raw.memory, ids),
  };
}

/** Validates a backup file's text. Nothing in it is trusted. */
export function parseBackup(text: unknown): ParseBackupResult {
  if (typeof text !== "string") return { ok: false, error: "invalid_file" };
  if (text.length > BACKUP_MAX_BYTES) return { ok: false, error: "too_large" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_file" };
  }
  if (!isRecord(parsed) || parsed.app !== BACKUP_APP) {
    return { ok: false, error: "invalid_file" };
  }
  if (
    typeof parsed.version !== "number" ||
    !BACKUP_READABLE_VERSIONS.includes(parsed.version)
  ) {
    return { ok: false, error: "unsupported_version" };
  }
  const data = sanitizeData(parsed.data);
  if (!data) return { ok: false, error: "invalid_file" };
  const exportedAt =
    typeof parsed.exportedAt === "string"
      ? parsed.exportedAt.slice(0, 40)
      : new Date(0).toISOString();
  const backup: Backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    data,
  };
  return { ok: true, backup };
}
