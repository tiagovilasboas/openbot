"use client";

import { useEffect } from "react";
import { migrateLocalKeys } from "./migrate-local-keys.ts";
import { putSavedKey } from "./saved-keys-api.ts";
import { refreshSavedKeys } from "./saved-keys-store.ts";

let started = false;

/** On app load: moves keys an older version left in this browser to the vault. */
export function useMigrateLocalKeys(): void {
  useEffect(() => {
    if (started) return;
    started = true;
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    void migrateLocalKeys(storage, (input) => putSavedKey(input)).then(
      (result) => {
        // A failed key stays in place and is tried again on the next load.
        if (result.migrated > 0) void refreshSavedKeys();
      },
    );
  }, []);
}
