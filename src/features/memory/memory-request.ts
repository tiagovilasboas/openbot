import { memoryTexts } from "./memory-block.ts";
import { loadMemoryEnabled } from "./memory-setting.ts";
import { loadMemoryEntries, type MemoryStorage } from "./memory-storage.ts";

/**
 * The raw notes a chat request carries for a bot: nothing when the user
 * turned memory off. The server builds the prompt block from these.
 */
export function memoryTextsForRequest(
  botId: string,
  storage?: MemoryStorage,
): string[] {
  if (!loadMemoryEnabled(storage)) return [];
  return memoryTexts(loadMemoryEntries(botId, storage));
}
