import type { MessageData } from "../chat/ChatMessageItem.tsx";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import type { BotProfile } from "../bots/bot-types.ts";
import type { MemoryEntry } from "../memory/memory-entries.ts";

export const BACKUP_APP = "openbot";
export const BACKUP_VERSION = 1;
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

/** The only storage keys a backup reads. Everything else is never exported. */
export const BACKUP_ALLOWED_KEYS = {
  bots: "openbot_bots",
  activeBotId: "openbot_active_bot_id",
  mainBotId: "openbot_main_bot_id",
  language: "openbot_language",
  messagesPrefix: "openbot_msgs_",
  memoryPrefix: "openbot_memory_",
} as const;

/** The slice of Storage that backup needs; localStorage satisfies it. */
export type BackupStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface BackupData {
  bots: BotProfile[];
  activeBotId?: string;
  mainBotId?: string;
  language?: ChatLanguage;
  /** Conversation per bot id. Has no prototype, so any id is a plain key. */
  messages: Record<string, MessageData[]>;
  /** Memory notes per bot id, capped on read. Also has no prototype. */
  memory: Record<string, MemoryEntry[]>;
}

export interface Backup {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: BackupData;
}

export type BackupErrorCode =
  "invalid_file" | "unsupported_version" | "too_large";

export type ParseBackupResult =
  { ok: true; backup: Backup } | { ok: false; error: BackupErrorCode };

export type RestoreMode = "replace" | "merge";

export interface BackupSummary {
  bots: number;
  conversations: number;
}
