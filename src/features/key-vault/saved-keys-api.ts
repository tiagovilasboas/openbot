import { withApiHeaders } from "../server-guard/api-request-init.ts";
import {
  KEYED_PROVIDERS,
  OAUTH_PROVIDERS,
  type KeyedProvider,
  type OAuthProvider,
} from "../model/provider-keys.ts";

// Client calls to /api/keys. They never see a key value coming back: the
// server only lists which providers have a key, for which origin, and when.

export type SavedKey = {
  provider: KeyedProvider;
  origin: string;
  updatedAt: number;
};
export type SavedKeys = Partial<Record<KeyedProvider, SavedKey>>;

export type SavedOAuthSession = {
  provider: OAuthProvider;
  origin: string;
  updatedAt: number;
  expiresAt: number | null;
  needsReauth: boolean;
  accountLabel: string | null;
};
export type SavedOAuthSessions = Partial<
  Record<OAuthProvider, SavedOAuthSession>
>;

export type VaultStatusSnapshot = {
  keys: SavedKeys;
  oauthSessions: SavedOAuthSessions;
};

type FetchLike = typeof fetch;

function isSavedKey(value: unknown): value is SavedKey {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    KEYED_PROVIDERS.some((provider) => provider === item.provider) &&
    typeof item.origin === "string" &&
    typeof item.updatedAt === "number"
  );
}

function isSavedOAuthSession(value: unknown): value is SavedOAuthSession {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    OAUTH_PROVIDERS.some((provider) => provider === item.provider) &&
    typeof item.origin === "string" &&
    typeof item.updatedAt === "number" &&
    (item.expiresAt === null || typeof item.expiresAt === "number") &&
    typeof item.needsReauth === "boolean" &&
    (item.accountLabel === null || typeof item.accountLabel === "string")
  );
}

/** Keys and OAuth session summaries, or null when the server could not say. */
export async function fetchVaultStatus(
  fetchImpl: FetchLike = fetch,
): Promise<VaultStatusSnapshot | null> {
  try {
    const response = await fetchImpl("/api/keys", withApiHeaders());
    if (!response.ok) return null;
    const body = (await response.json()) as {
      keys?: unknown;
      oauthSessions?: unknown;
    };
    if (!Array.isArray(body.keys)) return null;
    const keys: SavedKeys = {};
    for (const item of body.keys) {
      if (isSavedKey(item)) keys[item.provider] = item;
    }
    const oauthSessions: SavedOAuthSessions = {};
    if (Array.isArray(body.oauthSessions)) {
      for (const item of body.oauthSessions) {
        if (isSavedOAuthSession(item)) oauthSessions[item.provider] = item;
      }
    }
    return { keys, oauthSessions };
  } catch {
    return null;
  }
}

/** The saved keys, or null when the server could not say. */
export async function fetchSavedKeys(
  fetchImpl: FetchLike = fetch,
): Promise<SavedKeys | null> {
  const status = await fetchVaultStatus(fetchImpl);
  return status ? status.keys : null;
}

/** True once the server answered 200: the key is saved for that origin. */
export async function putSavedKey(
  input: { provider: KeyedProvider; origin: string; key: string },
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(
      "/api/keys",
      withApiHeaders({
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    return response.status === 200;
  } catch {
    return false;
  }
}

export async function deleteSavedKey(
  provider: KeyedProvider,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  try {
    const response = await fetchImpl(
      `/api/keys?provider=${provider}`,
      withApiHeaders({ method: "DELETE" }),
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function deleteAllSavedKeys(
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  await Promise.all(
    KEYED_PROVIDERS.map((provider) => deleteSavedKey(provider, fetchImpl)),
  );
}

/** Whether a saved key exists for this provider and exactly this origin. */
export function hasSavedKeyFor(
  saved: SavedKeys,
  provider: KeyedProvider,
  origin: string | null,
): boolean {
  return origin !== null && saved[provider]?.origin === origin;
}
