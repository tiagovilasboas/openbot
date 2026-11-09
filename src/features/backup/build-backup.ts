import { loadActiveBotId, loadBotsFromStorage } from "../bots/bot-storage.ts";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import {
  BACKUP_ALLOWED_KEYS,
  BACKUP_APP,
  BACKUP_VERSION,
  type Backup,
  type BackupStorage,
  type BackupSummary,
} from "./backup-types.ts";

function readMessages(storage: BackupStorage, botId: string): MessageData[] {
  try {
    const raw = storage.getItem(BACKUP_ALLOWED_KEYS.messagesPrefix + botId);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as MessageData[]) : [];
  } catch {
    return [];
  }
}

/**
 * Collects the user's data. It reads only the allow-listed keys, so API keys,
 * tokens and password hashes are never touched, whatever else is stored.
 */
export function buildBackup(
  storage: BackupStorage,
  language?: ChatLanguage,
  now: Date = new Date(),
): Backup {
  const bots = loadBotsFromStorage(storage as Storage);
  const messages: Record<string, MessageData[]> = Object.create(null);
  for (const bot of bots) {
    const list = readMessages(storage, bot.id);
    if (list.length > 0) messages[bot.id] = list;
  }
  const mainBotId = storage.getItem(BACKUP_ALLOWED_KEYS.mainBotId);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: {
      bots,
      activeBotId: loadActiveBotId(storage as Storage),
      ...(mainBotId ? { mainBotId } : {}),
      ...(language ? { language } : {}),
      messages,
    },
  };
}

export function summarizeBackup(backup: Backup): BackupSummary {
  return {
    bots: backup.data.bots.length,
    conversations: Object.values(backup.data.messages).filter(
      (list) => list.length > 0,
    ).length,
  };
}

export function backupFileName(now: Date = new Date()): string {
  return `openbot-backup-${now.toISOString().slice(0, 10)}.json`;
}
