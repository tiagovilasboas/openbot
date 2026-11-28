import type {
  ConnectionId,
  CredentialStatus,
  CredentialStore,
  OAuthClientIdentityStore,
} from "../core/index.ts";
import {
  ANTHROPIC_ORIGIN,
  CHATGPT_ORIGIN,
  OPENROUTER_ORIGIN,
} from "../../key-vault/key-origin.ts";
import type { VaultContext } from "../../key-vault/keys-handler.ts";
import {
  deleteOAuthSession,
  listOAuthSessionSummaries,
  readOrCreateOAuthHostIdentity,
  saveOAuthClientId,
  saveOAuthSession,
} from "../../key-vault/oauth-session-repository.ts";
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

const API_KEY_ORIGINS = {
  router: OPENROUTER_ORIGIN,
  anthropic: ANTHROPIC_ORIGIN,
} as const;

const OAUTH_SESSION_ORIGINS = {
  chatgpt: CHATGPT_ORIGIN,
} as const;

type ApiKeyConnection = keyof typeof API_KEY_ORIGINS;
type OAuthSessionConnection = keyof typeof OAUTH_SESSION_ORIGINS;
type VaultConnection = ApiKeyConnection | OAuthSessionConnection;

function isApiKeyConnection(id: ConnectionId): id is ApiKeyConnection {
  return Object.hasOwn(API_KEY_ORIGINS, id);
}

function isOAuthSessionConnection(
  id: ConnectionId,
): id is OAuthSessionConnection {
  return Object.hasOwn(OAUTH_SESSION_ORIGINS, id);
}

/** Whether the vault keeps this connection's credential on the server. */
export function keepsCredential(id: ConnectionId): id is VaultConnection {
  return isApiKeyConnection(id) || isOAuthSessionConnection(id);
}

function assertVaultSlot(id: ConnectionId): VaultConnection {
  if (!keepsCredential(id)) throw new Error(`no vault slot for ${id}`);
  return id;
}

function assertOAuthSlot(id: ConnectionId): OAuthSessionConnection {
  if (!isOAuthSessionConnection(id)) {
    throw new Error(`no oauth identity slot for ${id}`);
  }
  return id;
}

/** `context` is read per call, so a broken vault fails the call, not the import. */
export function createVaultCredentialStore(
  context: () => VaultContext,
): CredentialStore {
  return {
    async save(id, credential) {
      assertVaultSlot(id);
      if (credential.kind === "api-key") {
        if (!isApiKeyConnection(id)) {
          throw new Error(`invalid credential kind for ${id}`);
        }
        const key = validateKey(credential.secret);
        // The message never carries the credential.
        if (!key.ok) throw new Error("credential refused by the vault rules");
        const { db, masterKey } = context();
        saveProviderKey(db, masterKey, {
          provider: id,
          origin: API_KEY_ORIGINS[id],
          key: key.value,
        });
        return;
      }

      if (!isOAuthSessionConnection(id)) {
        throw new Error(`invalid credential kind for ${id}`);
      }
      const { db, masterKey } = context();
      saveOAuthSession(db, masterKey, {
        provider: id,
        origin: OAUTH_SESSION_ORIGINS[id],
        session: {
          accessToken: credential.accessToken,
          ...(credential.refreshToken
            ? { refreshToken: credential.refreshToken }
            : {}),
          expiresAt: credential.expiresAt,
          ...(credential.clientId ? { clientId: credential.clientId } : {}),
          ...(credential.hostId ? { hostId: credential.hostId } : {}),
          accountLabel: credential.accountLabel ?? null,
          needsReauth: false,
        },
      });
    },

    async remove(id) {
      assertVaultSlot(id);
      if (isOAuthSessionConnection(id)) {
        deleteOAuthSession(context().db, id);
        return;
      }
      deleteProviderKey(context().db, id);
    },

    async status(id): Promise<CredentialStatus> {
      assertVaultSlot(id);
      if (isOAuthSessionConnection(id)) {
        const saved = listOAuthSessionSummaries(context().db).find(
          (row) => row.provider === id,
        );
        return saved
          ? {
              connected: true,
              updatedAt: saved.updatedAt,
              expiresAt: saved.expiresAt,
              needsReauth: saved.needsReauth,
              accountLabel: saved.accountLabel,
            }
          : { connected: false, updatedAt: null };
      }
      const saved = listProviderKeys(context().db).find(
        (row) => row.provider === id,
      );
      return saved
        ? { connected: true, updatedAt: saved.updatedAt }
        : { connected: false, updatedAt: null };
    },
  };
}

/** Vault-backed store for per-provider host UUID and dynamic client_id. */
export function createVaultClientIdentityStore(
  context: () => VaultContext,
): OAuthClientIdentityStore {
  return {
    readOrCreateHostId(id) {
      return readOrCreateOAuthHostIdentity(context().db, assertOAuthSlot(id))
        .hostId;
    },
    saveClientId(id, clientId) {
      saveOAuthClientId(context().db, assertOAuthSlot(id), clientId);
    },
    readClientId(id) {
      return readOrCreateOAuthHostIdentity(context().db, assertOAuthSlot(id))
        .clientId;
    },
  };
}
