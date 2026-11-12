import type { SyncFailure } from "./settings-sync-types.ts";

/** The failures worth telling the user about, each with its own copy. */
export type SettingsSyncErrorCode = "unauthorized" | "rejected";

/**
 * Maps a failed write to what the user should see. A lost connection or a
 * server error stays quiet: the setting stays in the browser and the next
 * change or load delivers it. Only a refusal (4xx) is surfaced.
 */
export function settingsSyncErrorCode(
  failure: SyncFailure,
): SettingsSyncErrorCode | null {
  if (failure.kind === "network") return null;
  if (failure.status === 401 || failure.status === 403) return "unauthorized";
  return failure.status >= 400 && failure.status < 500 ? "rejected" : null;
}
