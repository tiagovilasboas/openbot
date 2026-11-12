import type {
  SyncFailure,
  WriteResult,
} from "../../conversations/sync/conversations-sync-types.ts";
import type { MemoryEntry } from "../memory-entries.ts";

export type NotesResult =
  { ok: true; entries: MemoryEntry[] } | { ok: false; failure: SyncFailure };

export interface MemoryApi {
  get(botId: string): Promise<NotesResult>;
  /** Replaces the whole list; an empty list deletes it. */
  put(botId: string, entries: readonly MemoryEntry[]): Promise<WriteResult>;
  remove(botId: string): Promise<WriteResult>;
}

/** One write to a bot's notes on the server. */
export type NotesOp =
  { kind: "put"; entries: readonly MemoryEntry[] } | { kind: "delete" };
