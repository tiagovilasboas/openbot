import type { SyncFailure } from "./bots-sync-types.ts";

/** The failures worth telling the user about, each with its own copy. */
export type BotsSyncErrorCode =
  "main_bot_required" | "payload_too_large" | "unauthorized" | "rejected";

/**
 * Maps a failed write to what the user should see. A lost connection or a
 * server error is not shown: the edits stay in the browser and the next load
 * delivers them. Only a refusal (4xx) is surfaced.
 */
export function botsSyncErrorCode(
  failure: SyncFailure,
): BotsSyncErrorCode | null {
  if (failure.kind === "network") return null;
  if (failure.error === "main_bot_required") return "main_bot_required";
  if (failure.error === "payload_too_large" || failure.status === 413) {
    return "payload_too_large";
  }
  if (failure.status === 401 || failure.status === 403) return "unauthorized";
  return failure.status >= 400 && failure.status < 500 ? "rejected" : null;
}
