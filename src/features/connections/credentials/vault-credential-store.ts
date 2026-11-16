import type {
  ConnectionId,
  CredentialStatus,
  CredentialStore,
} from "../core/index.ts";
import {
  ANTHROPIC_ORIGIN,
  OPENROUTER_ORIGIN,
} from "../../key-vault/key-origin.ts";
import type { VaultContext } from "../../key-vault/keys-handler.ts";
import {
  deleteProviderKey,
  listProviderKeys,
  saveProviderKey,
} from "../../key-vault/provider-key-repository.ts";
import { validateKey } from "../../key-vault/vault-validation.ts";

/**
 * The only bridge from connections to the key vault. The vault stays the
 * owner of the cipher; this adapter picks the slot and origin per connection.
 */

// The origin a connection's credential is saved for: where models read it back.
const VAULT_ORIGINS = {
  router: OPENROUTER_ORIGIN,
  anthropic: ANTHROPIC_ORIGIN,
} as const;

type VaultConnection = keyof typeof VAULT_ORIGINS;

/** Whether the vault keeps this connection's credential on the server. */
export function keepsCredential(id: ConnectionId): id is VaultConnection {
  return Object.hasOwn(VAULT_ORIGINS, id);
}

function vaultSlot(id: ConnectionId): VaultConnection {
  if (!keepsCredential(id)) throw new Error(`no vault slot for ${id}`);
  return id;
}

/** `context` is read per call, so a broken vault fails the call, not the import. */
export function createVaultCredentialStore(
  context: () => VaultContext,
): CredentialStore {
  return {
    async save(id, credential) {
      const provider = vaultSlot(id);
      const key = validateKey(credential);
      // The message never carries the credential.
      if (!key.ok) throw new Error("credential refused by the vault rules");
      const { db, masterKey } = context();
      saveProviderKey(db, masterKey, {
        provider,
        origin: VAULT_ORIGINS[provider],
        key: key.value,
      });
    },
    async remove(id) {
      deleteProviderKey(context().db, vaultSlot(id));
    },
    async status(id): Promise<CredentialStatus> {
      const provider = vaultSlot(id);
      const saved = listProviderKeys(context().db).find(
        (row) => row.provider === provider,
      );
      return saved
        ? { connected: true, updatedAt: saved.updatedAt }
        : { connected: false, updatedAt: null };
    },
  };
}
