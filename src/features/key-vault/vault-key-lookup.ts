import type { KeyLookup } from "./apply-vault-keys.ts";
import { readProviderKey } from "./provider-key-repository.ts";
import { getVaultContext } from "./vault-context.ts";

// Server only: reads the process-wide vault. An unavailable vault means no
// key, so a request fails like one with no key, and the cause is logged.
export const vaultKeyLookup: KeyLookup = (provider, origin) => {
  try {
    const { db, masterKey } = getVaultContext();
    return readProviderKey(db, masterKey, provider, origin);
  } catch (error) {
    console.error("key vault unavailable:", (error as Error).message);
    return undefined;
  }
};
