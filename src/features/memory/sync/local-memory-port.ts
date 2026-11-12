/**
 * Holds the bots whose notes this browser changed without the server
 * confirming it, as a JSON list of bot ids. Per bot, so one stuck list never
 * makes another bot's newer server copy lose. The key must not start with
 * the per-bot notes prefix, or pruning would read it as a bot.
 */
export const MEMORY_UNSYNCED_KEY = "openbot_notes_unsynced";

function readIds(storage: Storage): Set<string> {
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(MEMORY_UNSYNCED_KEY) ?? "[]",
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

export function isMemoryUnsynced(storage: Storage, botId: string): boolean {
  return readIds(storage).has(botId);
}

export function setMemoryUnsynced(
  storage: Storage,
  botId: string,
  value: boolean,
): void {
  try {
    const ids = readIds(storage);
    if (value) ids.add(botId);
    else ids.delete(botId);
    if (ids.size > 0) {
      storage.setItem(MEMORY_UNSYNCED_KEY, JSON.stringify([...ids]));
    } else {
      storage.removeItem(MEMORY_UNSYNCED_KEY);
    }
  } catch {
    // Without storage the next load simply trusts the server.
  }
}
