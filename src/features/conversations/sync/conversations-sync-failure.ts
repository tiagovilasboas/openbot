import type { SyncFailure } from "./conversations-sync-types.ts";

/** The failures worth telling the user about, each with its own copy. */
export type ConversationsSyncErrorCode =
  "too_large" | "too_many_threads" | "unauthorized" | "rejected";

/**
 * Maps a failed write to what the user should see. A lost connection or a
 * server error stays quiet: the thread stays in the browser and the next
 * save or load delivers it. Only a refusal (4xx) is surfaced.
 */
export function conversationsSyncErrorCode(
  failure: SyncFailure,
): ConversationsSyncErrorCode | null {
  if (failure.kind === "network") return null;
  if (failure.error === "too_many_threads") return "too_many_threads";
  if (
    failure.error === "too_many_messages" ||
    failure.error === "payload_too_large" ||
    failure.status === 413
  ) {
    return "too_large";
  }
  if (failure.status === 401 || failure.status === 403) return "unauthorized";
  return failure.status >= 400 && failure.status < 500 ? "rejected" : null;
}
