import type { BackupStorage } from "./backup-types.ts";

export interface StorageWrite {
  key: string;
  value: string;
}

/**
 * Applies writes, then removals, as one unit. Every key is snapshotted first;
 * if any step throws (a full quota, a blocked store), the keys touched so far
 * go back to their old values and the original error is thrown again. The
 * removals run last, so a failed write never loses data the user had.
 */
export function applyStorageChanges(
  storage: BackupStorage,
  writes: readonly StorageWrite[],
  removals: readonly string[],
): void {
  const previous = new Map<string, string | null>();
  for (const key of [...writes.map((w) => w.key), ...removals]) {
    if (!previous.has(key)) previous.set(key, storage.getItem(key));
  }
  const touched: string[] = [];
  try {
    for (const { key, value } of writes) {
      touched.push(key);
      storage.setItem(key, value);
    }
    for (const key of removals) {
      touched.push(key);
      storage.removeItem(key);
    }
  } catch (error) {
    rollback(storage, touched, previous);
    throw error;
  }
}

function rollback(
  storage: BackupStorage,
  touched: readonly string[],
  previous: ReadonlyMap<string, string | null>,
): void {
  for (const key of [...touched].reverse()) {
    try {
      const old = previous.get(key) ?? null;
      if (old === null) storage.removeItem(key);
      else storage.setItem(key, old);
    } catch {
      // Best effort: keep restoring the other keys.
    }
  }
}
