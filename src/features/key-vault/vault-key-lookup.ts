import type { DatabaseSync } from "node:sqlite";
import type { KeyLookup, OAuthTokenLookup } from "./apply-vault-keys.ts";
import {
  resolveOAuthAccessToken,
  type OAuthRefreshOptions,
  type OAuthRefreshResult,
} from "./oauth-refresh.ts";
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

export async function resolveVaultOAuthToken(
  db: DatabaseSync,
  provider: string,
  origin: string,
  options?: OAuthRefreshOptions & { masterKey?: Buffer },
): Promise<OAuthRefreshResult> {
  let masterKey: Buffer;
  try {
    masterKey = options?.masterKey ?? getVaultContext().masterKey;
  } catch (error) {
    console.error("key vault unavailable:", (error as Error).message);
    return { ok: false, reason: "vault_unavailable" };
  }
  return resolveOAuthAccessToken(db, masterKey, provider, origin, options);
}

export type OAuthSessionLookup = (
  provider: string,
  origin: string,
) => Promise<OAuthRefreshResult>;

export const noOAuthSessionLookup: OAuthSessionLookup = async () => ({
  ok: false,
  reason: "missing_session",
});

export async function resolveVaultOAuthSession(
  provider: string,
  origin: string,
  options?: OAuthRefreshOptions,
): Promise<OAuthRefreshResult> {
  try {
    const { db, masterKey } = getVaultContext();
    return await resolveVaultOAuthToken(db, provider, origin, {
      ...options,
      masterKey,
    });
  } catch (error) {
    console.error("key vault unavailable:", (error as Error).message);
    return { ok: false, reason: "vault_unavailable" };
  }
}

export const vaultOAuthLookup: OAuthTokenLookup = async (provider, origin) => {
  const resolved = await resolveVaultOAuthSession(provider, origin);
  return resolved.ok ? resolved.accessToken : undefined;
};
