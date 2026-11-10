import { loadBotsFromStorage } from "../bots/bot-storage.ts";
import type { MemoryEntry } from "../memory/memory-entries.ts";
import {
  BACKUP_ALLOWED_KEYS,
  type Backup,
  type BackupStorage,
  type BackupSummary,
  type RestoreMode,
} from "./backup-types.ts";

const KEYS = BACKUP_ALLOWED_KEYS;

function writeMemory(
  storage: BackupStorage,
  botId: string,
  notes: MemoryEntry[] | undefined,
): void {
  if (notes && notes.length > 0) {
    storage.setItem(KEYS.memoryPrefix + botId, JSON.stringify(notes));
  }
}

/**
 * Writes an already parsed backup. "replace" swaps the user's bots and
 * conversations for the file's; "merge" keeps every existing bot and its
 * conversation and adds the bots whose ids are new. Only allow-listed keys
 * are written. The caller reloads app state afterwards.
 */
export function restoreBackup(
  backup: Backup,
  storage: BackupStorage,
  mode: RestoreMode,
): BackupSummary {
  const { data } = backup;
  const existing = loadBotsFromStorage(storage as Storage);

  if (mode === "replace") {
    for (const bot of existing) {
      storage.removeItem(KEYS.messagesPrefix + bot.id);
      storage.removeItem(KEYS.memoryPrefix + bot.id);
    }
    storage.setItem(KEYS.bots, JSON.stringify(data.bots));
    for (const [id, list] of Object.entries(data.messages)) {
      storage.setItem(KEYS.messagesPrefix + id, JSON.stringify(list));
    }
    for (const [id, notes] of Object.entries(data.memory)) {
      writeMemory(storage, id, notes);
    }
    if (data.activeBotId) storage.setItem(KEYS.activeBotId, data.activeBotId);
    if (data.mainBotId) storage.setItem(KEYS.mainBotId, data.mainBotId);
    // A replace brings the saved language back too; a merge keeps the user's.
    if (data.language) storage.setItem(KEYS.language, data.language);
    return {
      bots: data.bots.length,
      conversations: Object.keys(data.messages).length,
    };
  }

  const known = new Set(existing.map((bot) => bot.id));
  const added = data.bots.filter((bot) => !known.has(bot.id));
  storage.setItem(KEYS.bots, JSON.stringify([...existing, ...added]));
  let conversations = 0;
  for (const bot of added) {
    writeMemory(storage, bot.id, data.memory[bot.id]);
    const list = data.messages[bot.id];
    if (!list) continue;
    storage.setItem(KEYS.messagesPrefix + bot.id, JSON.stringify(list));
    conversations += 1;
  }
  return { bots: added.length, conversations };
}
