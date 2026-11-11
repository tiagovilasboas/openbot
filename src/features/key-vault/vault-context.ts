import { getLocalStore } from "../../shared/local-store/local-store.ts";
import type { VaultContext } from "./keys-handler.ts";
import { resolveMasterKey } from "./master-key.ts";
import { migrateKeyVault } from "./provider-key-repository.ts";

const CONTEXT_KEY = Symbol.for("openbot.keyVaultContext");
type Holder = { [CONTEXT_KEY]?: VaultContext };

// Process-wide context: migrates once and resolves the master key once.
export function getVaultContext(): VaultContext {
  const holder = globalThis as Holder;
  if (!holder[CONTEXT_KEY]) {
    const db = getLocalStore();
    migrateKeyVault(db);
    holder[CONTEXT_KEY] = { db, masterKey: resolveMasterKey() };
  }
  return holder[CONTEXT_KEY];
}
