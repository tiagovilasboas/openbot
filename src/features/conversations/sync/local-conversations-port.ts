/**
 * Holds the bots whose thread this browser changed without the server
 * confirming it, as a JSON list of bot ids. Per bot, so one stuck thread
 * never makes another bot's newer server copy lose.
 */
export const MESSAGES_UNSYNCED_KEY = "openbot_conversations_unsynced";

function readIds(storage: Storage): Set<string> {
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

export function isMessagesUnsynced(storage: Storage, botId: string): boolean {
  return readIds(storage).has(botId);
}

export function setMessagesUnsynced(
  storage: Storage,
  botId: string,
  value: boolean,
): void {
  try {
    const ids = readIds(storage);
    if (value) ids.add(botId);
    else ids.delete(botId);
    if (ids.size > 0) {
      storage.setItem(MESSAGES_UNSYNCED_KEY, JSON.stringify([...ids]));
    } else {
      storage.removeItem(MESSAGES_UNSYNCED_KEY);
    }
  } catch {
    // Without storage the next load simply trusts the server.
  }
}
