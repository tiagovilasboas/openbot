import type { MemoryLoadDeps } from "./sync-memory-on-load.ts";

type RefreshDeps = Pick<
  MemoryLoadDeps,
  "api" | "readLocal" | "isUnsynced" | "mirror"
>;

/**
 * Takes the server's copy of one bot's notes after the server changed them
 * (a tool saved a note). A browser change the server has not confirmed yet,
 * or one made while the request was out, is never overwritten: its own
 * write is still on the way.
 */
export async function refreshMemoryNotes(
  deps: RefreshDeps,
  botId: string,
): Promise<void> {
  if (deps.isUnsynced(botId)) return;
  const before = deps.readLocal(botId);
  const server = await deps.api.get(botId);
  if (!server.ok) return;
  if (deps.readLocal(botId) !== before || deps.isUnsynced(botId)) return;
  deps.mirror(botId, server.entries);
}
