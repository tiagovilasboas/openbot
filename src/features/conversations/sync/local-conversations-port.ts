/**
 * Holds the bots whose thread this browser changed without the server
 * confirming it, as a JSON list of bot ids. Per bot, so one stuck thread
 * never makes another bot's newer server copy lose.
 */
import {
  DEFAULT_THREAD_ID,
  messageStorageId,
} from "../../threads/thread-model.ts";

export const MESSAGES_UNSYNCED_KEY = "openbot_conversations_unsynced";

type UnsyncedStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readIds(storage: UnsyncedStorage): Set<string> {
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(MESSAGES_UNSYNCED_KEY) ?? "[]",
    );
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

export function isMessagesUnsynced(
  storage: UnsyncedStorage,
  botId: string,
  threadId: string = DEFAULT_THREAD_ID,
): boolean {
  return readIds(storage).has(messageStorageId(botId, threadId));
}

export function setMessagesUnsynced(
  storage: UnsyncedStorage,
  botId: string,
  value: boolean,
  threadId: string = DEFAULT_THREAD_ID,
): void {
  try {
    const ids = readIds(storage);
    const id = messageStorageId(botId, threadId);
    if (value) ids.add(id);
    else ids.delete(id);
    if (ids.size > 0) {
      storage.setItem(MESSAGES_UNSYNCED_KEY, JSON.stringify([...ids]));
    } else {
      storage.removeItem(MESSAGES_UNSYNCED_KEY);
    }
  } catch {
    // Without storage the next load simply trusts the server.
  }
}

/**
 * A restore writes conversations straight into storage, bypassing the save
 * path. This is the unsynced list with those bots added, as a storage write
 * the restore applies with its other writes: the next load then keeps and
 * sends the restored chats instead of letting an older server copy win.
 */
export function restoredConversationsUnsyncedWrite(
  storage: UnsyncedStorage,
  botIds: readonly string[],
): { key: string; value: string } {
  const ids = readIds(storage);
  for (const botId of botIds) ids.add(botId);
  return { key: MESSAGES_UNSYNCED_KEY, value: JSON.stringify([...ids]) };
}
