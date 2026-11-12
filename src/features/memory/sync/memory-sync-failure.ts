import type { SyncFailure } from "../../conversations/sync/conversations-sync-types.ts";

/** The failures worth telling the user about, each with its own copy. */
export type MemorySyncErrorCode =
  "too_large" | "too_many_bots" | "unauthorized" | "rejected";

/**
 * Maps a failed write to what the user should see. A lost connection or a
 * server error stays quiet: the notes stay in the browser and the next save
 * or load delivers them. Only a refusal (4xx) is surfaced.
 */
export function memorySyncErrorCode(
  failure: SyncFailure,
): MemorySyncErrorCode | null {
  if (failure.kind === "network") return null;
  if (failure.error === "too_many_bots") return "too_many_bots";
  if (
    failure.error === "too_many_entries" ||
    failure.error === "payload_too_large" ||
    failure.status === 413
  ) {
    return "too_large";
  }
  if (failure.status === 401 || failure.status === 403) return "unauthorized";
  return failure.status >= 400 && failure.status < 500 ? "rejected" : null;
}
