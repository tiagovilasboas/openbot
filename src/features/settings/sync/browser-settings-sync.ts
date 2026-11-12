import {
  loadStoredLanguage,
  saveLanguage,
} from "../../chat/language-preference.ts";
import {
  loadStoredMemoryEnabled,
  saveMemoryEnabled,
} from "../../memory/memory-setting.ts";
import {
  loadStoredModelConfig,
  saveStoredModelConfig,
  type ClientModelConfig,
} from "../../model/model-config.ts";
import type { Language } from "../../language/language.ts";
import type { SettingsSyncPort } from "../settings-sync-port.ts";
import type { AppSettings, SettingKey } from "../settings-types.ts";
import { createSettingsApi } from "./settings-api.ts";
import { createSettingsPutQueue } from "./settings-put-queue.ts";
import {
  settingsSyncErrorCode,
  type SettingsSyncErrorCode,
} from "./settings-sync-failure.ts";
import type { SyncFailure } from "./settings-sync-types.ts";
import {
  isSettingUnsynced,
  setSettingUnsynced,
} from "./local-settings-port.ts";
import { syncSettingsOnLoad } from "./sync-settings-on-load.ts";

/** The browser's wiring of the settings sync: real fetch and storage. */

type ErrorListener = (code: SettingsSyncErrorCode) => void;
let errorListeners: ErrorListener[] = [];

export function subscribeSettingsSyncErrors(
  listener: ErrorListener,
): () => void {
  errorListeners.push(listener);
  return () => {
    errorListeners = errorListeners.filter((l) => l !== listener);
  };
}

function report(failure: SyncFailure): void {
  const code = settingsSyncErrorCode(failure);
  if (code) errorListeners.forEach((listener) => listener(code));
}

const storage = (): Storage => window.localStorage;
const api = createSettingsApi();

const queue = createSettingsPutQueue({
  send: (patch) => api.put(patch),
  onResult: (result, _sent, settled) => {
    if (!result.ok) report(result.failure);
    else settled.forEach((key) => setSettingUnsynced(storage(), key, false));
  },
});

/** What the three storage modules call on every local change. */
export const browserSettingsSyncPort: SettingsSyncPort = {
  changed(patch) {
    (Object.keys(patch) as SettingKey[]).forEach((key) =>
      setSettingUnsynced(storage(), key, true),
    );
    queue.put(patch);
  },
};

const READ_LOCAL: { [K in SettingKey]: () => AppSettings[K] | undefined } = {
  language: () => loadStoredLanguage(),
  memoryEnabled: () => loadStoredMemoryEnabled(),
  modelConfig: () => loadStoredModelConfig() ?? undefined,
};

// Each write is a mirror: the cache changes, nothing goes back to the server.
function mirrorLocal(key: SettingKey, value: AppSettings[SettingKey]): void {
  const noSend = { sync: false };
  if (key === "language") saveLanguage(value as Language, undefined, noSend);
  else if (key === "memoryEnabled") {
    saveMemoryEnabled(value as boolean, undefined, noSend);
  } else saveStoredModelConfig(value as ClientModelConfig, noSend);
}

let loading: Promise<void> | null = null;

/** Loads the settings once per page; safe to call repeatedly. */
export function loadSettingsFromServer(): Promise<void> {
  loading ??= syncSettingsOnLoad({
    api,
    readLocal: (key) => READ_LOCAL[key](),
    isUnsynced: (key) => isSettingUnsynced(storage(), key),
    setUnsynced: (key, value) => setSettingUnsynced(storage(), key, value),
    mirror: mirrorLocal,
    reportFailure: report,
  }).catch(() => {
    // Loading never throws: the browser's values are used as they are.
  });
  return loading;
}

/**
 * A backup restore writes the language straight to the browser; this sends
 * it to the server too, or the next load would bring the old one back.
 */
export function pushRestoredLanguage(): void {
  const language = loadStoredLanguage();
  if (language) browserSettingsSyncPort.changed({ language });
}
