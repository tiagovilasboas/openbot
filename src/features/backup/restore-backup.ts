import { loadBotsFromStorage } from "../bots/bot-storage.ts";
import type { MemoryEntry } from "../memory/memory-entries.ts";
import {
  applyStorageChanges,
  type StorageWrite,
} from "./apply-storage-changes.ts";
import {
  BACKUP_ALLOWED_KEYS,
  type Backup,
  type BackupStorage,
  type BackupSummary,
  type RestoreMode,
} from "./backup-types.ts";

const KEYS = BACKUP_ALLOWED_KEYS;

function memoryWrite(
  botId: string,
  notes: MemoryEntry[] | undefined,
): StorageWrite[] {
  return notes && notes.length > 0
    ? [{ key: KEYS.memoryPrefix + botId, value: JSON.stringify(notes) }]
    : [];
}

function replaceWrites({ data }: Backup): StorageWrite[] {
  const writes: StorageWrite[] = [
    { key: KEYS.bots, value: JSON.stringify(data.bots) },
  ];
  for (const [id, list] of Object.entries(data.messages)) {
    writes.push({ key: KEYS.messagesPrefix + id, value: JSON.stringify(list) });
  }
  for (const [id, notes] of Object.entries(data.memory)) {
    writes.push(...memoryWrite(id, notes));
  }
  if (data.activeBotId) {
    writes.push({ key: KEYS.activeBotId, value: data.activeBotId });
  }
  if (data.mainBotId) {
    writes.push({ key: KEYS.mainBotId, value: data.mainBotId });
  }
  // A replace brings the saved language back too; a merge keeps the user's.
  if (data.language) writes.push({ key: KEYS.language, value: data.language });
  return writes;
}

/** Conversation and memory keys of the old bots that the backup leaves out. */
function staleKeys(
  existingIds: readonly string[],
  writes: readonly StorageWrite[],
): string[] {
  const written = new Set(writes.map((write) => write.key));
  return existingIds
    .flatMap((id) => [KEYS.messagesPrefix + id, KEYS.memoryPrefix + id])
    .filter((key) => !written.has(key));
}

/**
 * Writes an already parsed backup. "replace" swaps the user's bots and
 * conversations for the file's; "merge" keeps every existing bot and its
 * conversation and adds the bots whose ids are new. Only allow-listed keys
 * are written. Everything is written first and the old keys are removed
 * last; if a write fails, every touched key is put back and the error is
 * thrown, so a restore never ends half done. The caller reloads app state.
 */
export function restoreBackup(
  backup: Backup,
  storage: BackupStorage,
  mode: RestoreMode,
): BackupSummary {
  const { data } = backup;
  const existing = loadBotsFromStorage(storage as Storage);

  if (mode === "replace") {
    const writes = replaceWrites(backup);
    const stale = staleKeys(
      existing.map((bot) => bot.id),
      writes,
    );
    applyStorageChanges(storage, writes, stale);
    return {
      bots: data.bots.length,
      conversations: Object.keys(data.messages).length,
    };
  }

  const known = new Set(existing.map((bot) => bot.id));
  const added = data.bots.filter((bot) => !known.has(bot.id));
  const writes: StorageWrite[] = [];
  let conversations = 0;
  for (const bot of added) {
    writes.push(...memoryWrite(bot.id, data.memory[bot.id]));
    const list = data.messages[bot.id];
    if (!list) continue;
    writes.push({
      key: KEYS.messagesPrefix + bot.id,
      value: JSON.stringify(list),
    });
    conversations += 1;
  }
  writes.push({
    key: KEYS.bots,
    value: JSON.stringify([...existing, ...added]),
  });
  applyStorageChanges(storage, writes, []);
  return { bots: added.length, conversations };
}
