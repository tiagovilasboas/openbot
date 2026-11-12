import type { SettingsPatch } from "./settings-types.ts";

/**
 * What the small storage modules (language, memory switch, model config) tell
 * whoever mirrors them to the server. They keep their synchronous reads; the
 * sync is injected so rendering never waits on it.
 */
export interface SettingsSyncPort {
  /** Settings were changed locally; the server copy is now behind. */
  changed(patch: SettingsPatch): void;
}

let port: SettingsSyncPort | null = null;

export function connectSettingsSync(next: SettingsSyncPort | null): void {
  port = next;
}

/** Tells the server about a local change; a no-op while nothing is connected. */
export function notifySettingsChanged(patch: SettingsPatch): void {
  port?.changed(patch);
}
