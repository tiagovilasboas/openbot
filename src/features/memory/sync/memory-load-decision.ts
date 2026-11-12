import type { MemoryEntry } from "../memory-entries.ts";
import type { NotesResult } from "./memory-sync-types.ts";

export type NotesLoadDecision =
  | { action: "use-server"; entries: MemoryEntry[] }
  | { action: "import"; entries: MemoryEntry[] }
  | { action: "keep-local" };

/**
 * What the first load does for one bot's notes. The server is the source
 * of truth, except when it cannot be reached or when this browser holds
 * a change to these notes it never delivered. An empty server takes the
 * browser's notes.
 */
export function decideNotesLoad(input: {
  server: NotesResult;
  local: readonly MemoryEntry[];
  unsynced: boolean;
}): NotesLoadDecision {
  const { server, local, unsynced } = input;
  if (!server.ok) return { action: "keep-local" };
  // Undelivered edits win, a cleared list included.
  if (unsynced) return { action: "import", entries: [...local] };
  if (server.entries.length > 0) {
    const same = JSON.stringify(server.entries) === JSON.stringify(local);
    return same
      ? { action: "keep-local" }
      : { action: "use-server", entries: server.entries };
  }
  if (local.length > 0) return { action: "import", entries: [...local] };
  return { action: "keep-local" };
}
