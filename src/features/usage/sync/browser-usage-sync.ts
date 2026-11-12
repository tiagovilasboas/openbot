import type { SyncFailure } from "../../conversations/sync/conversations-sync-types.ts";
import type { UsageSyncPort } from "../usage-sync-port.ts";
import { loadUsage, saveUsage } from "../usage-storage.ts";
import { createUsageApi } from "./usage-api.ts";
import { isUsageUnsynced, setUsageUnsynced } from "./local-usage-port.ts";
import { createUsagePutQueue } from "./usage-put-queue.ts";
import {
  usageSyncErrorCode,
  type UsageSyncErrorCode,
} from "./usage-sync-failure.ts";
import { syncUsageOnLoad } from "./sync-usage-on-load.ts";

/** The browser's wiring of the usage sync: real fetch and storage. */

type ErrorListener = (code: UsageSyncErrorCode) => void;
let errorListeners: ErrorListener[] = [];

export function subscribeUsageSyncErrors(listener: ErrorListener): () => void {
  errorListeners.push(listener);
  return () => {
    errorListeners = errorListeners.filter((l) => l !== listener);
  };
}

function report(failure: SyncFailure): void {
  const code = usageSyncErrorCode(failure);
  if (code) errorListeners.forEach((listener) => listener(code));
}

const storage = (): Storage => window.localStorage;
const api = createUsageApi();

const queue = createUsagePutQueue({
  send: (records) => api.put(records),
  onResult: (result, settled) => {
    if (!result.ok) report(result.failure);
    else if (settled) setUsageUnsynced(storage(), false);
  },
});

/** What the usage cache calls on every save. */
export const browserUsageSyncPort: UsageSyncPort = {
  saved(records) {
    setUsageUnsynced(storage(), true);
    queue.put(records);
  },
};

let loading: Promise<void> | null = null;

/** Loads the usage log once per page; safe to call repeatedly. */
export function loadUsageFromServer(): Promise<void> {
  loading ??= syncUsageOnLoad({
    api,
    readLocal: () => loadUsage(),
    isUnsynced: () => isUsageUnsynced(storage()),
    setUnsynced: (value) => setUsageUnsynced(storage(), value),
    mirror: (records) => {
      saveUsage(records, storage(), { sync: false });
    },
    reportFailure: report,
  }).catch(() => {
    // Loading never throws: the cache is used as it is.
  });
  return loading;
}
