import type { DatabaseSync } from "node:sqlite";
import {
  markOAuthSessionNeedsReauth,
  readOAuthSession,
  saveOAuthSession,
  type OAuthSessionSecret,
} from "./oauth-session-repository.ts";

const REFRESH_SKEW_MS = 60_000;
const REFRESH_TIMEOUT_MS = 15_000;

export const OAUTH_REFRESH_ENDPOINTS: Readonly<Record<string, string>> = {
  chatgpt: "https://auth.openai.com/api/accounts/oauth/token",
};

export type OAuthRefreshFailureReason =
  | "missing_session"
  | "reauth_required"
  | "unsupported_provider"
  | "refresh_failed"
  | "vault_unavailable";

export type OAuthRefreshResult =
  | { ok: true; accessToken: string; refreshed: boolean }
  | { ok: false; reason: OAuthRefreshFailureReason };

export type OAuthRefreshOptions = {
  fetchImpl?: typeof fetch;
  now?: () => number;
};

const inFlightRefreshes = new Map<string, Promise<OAuthRefreshResult>>();

function needsRefresh(expiresAt: number | null, now: number): boolean {
  return expiresAt !== null && now >= expiresAt - REFRESH_SKEW_MS;
}

function readStoredClientId(
  db: DatabaseSync,
  provider: string,
): string | undefined {
  const row = db
    .prepare("SELECT client_id FROM oauth_client_identities WHERE provider = ?")
    .get(provider) as { client_id: string | null } | undefined;
  return row?.client_id ?? undefined;
}

function isTransientOAuthError(errorCode: unknown): boolean {
  return (
    errorCode === "temporarily_unavailable" || errorCode === "server_error"
  );
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const parsed = (await response.json()) as { error?: unknown };
    return typeof parsed.error === "string" ? parsed.error : undefined;
  } catch {
    return undefined;
  }
}

async function performRefresh(
  db: DatabaseSync,
  masterKey: Buffer,
  provider: string,
  origin: string,
  session: OAuthSessionSecret,
  endpoint: string,
  fetchImpl: typeof fetch,
  now: number,
): Promise<OAuthRefreshResult> {
  if (!session.refreshToken) {
    if (session.expiresAt !== null && now >= session.expiresAt) {
      markOAuthSessionNeedsReauth(db, provider, now);
      return { ok: false, reason: "reauth_required" };
    }
    return { ok: true, accessToken: session.accessToken, refreshed: false };
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
  });
  const clientId = session.clientId ?? readStoredClientId(db, provider);
  if (clientId) params.set("client_id", clientId);

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: params.toString(),
      redirect: "error",
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "refresh_failed" };
  }

  if (response.status === 400 || response.status === 401) {
    const code = await readErrorCode(response);
    if (response.status === 400 && isTransientOAuthError(code)) {
      return { ok: false, reason: "refresh_failed" };
    }
    markOAuthSessionNeedsReauth(db, provider, now);
    return { ok: false, reason: "reauth_required" };
  }

  if (!response.ok) {
    return { ok: false, reason: "refresh_failed" };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, reason: "refresh_failed" };
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return { ok: false, reason: "refresh_failed" };
  }
  const tokenResponse = payload as Record<string, unknown>;
  if (
    typeof tokenResponse.access_token !== "string" ||
    !tokenResponse.access_token
  ) {
    return { ok: false, reason: "refresh_failed" };
  }

  const nextRefreshToken =
    typeof tokenResponse.refresh_token === "string" &&
    tokenResponse.refresh_token
      ? tokenResponse.refresh_token
      : session.refreshToken;
  const nextExpiresAt =
    typeof tokenResponse.expires_in === "number" &&
    Number.isFinite(tokenResponse.expires_in) &&
    tokenResponse.expires_in > 0
      ? now + Math.floor(tokenResponse.expires_in * 1000)
      : session.expiresAt;

  saveOAuthSession(
    db,
    masterKey,
    {
      provider,
      origin,
      session: {
        ...session,
        accessToken: tokenResponse.access_token,
        refreshToken: nextRefreshToken,
        expiresAt: nextExpiresAt,
        needsReauth: false,
      },
    },
    now,
  );

  return {
    ok: true,
    accessToken: tokenResponse.access_token,
    refreshed: true,
  };
}

export async function resolveOAuthAccessToken(
  db: DatabaseSync,
  masterKey: Buffer,
  provider: string,
  origin: string,
  options: OAuthRefreshOptions = {},
): Promise<OAuthRefreshResult> {
  const existing = inFlightRefreshes.get(provider);
  if (existing) return existing;

  const nowFn = options.now ?? (() => Date.now());
  const now = nowFn();
  const session = readOAuthSession(db, masterKey, provider, origin);
  if (!session) return { ok: false, reason: "missing_session" };
  if (session.needsReauth) return { ok: false, reason: "reauth_required" };

  if (!needsRefresh(session.expiresAt, now)) {
    return { ok: true, accessToken: session.accessToken, refreshed: false };
  }

  if (!session.refreshToken) {
    if (session.expiresAt !== null && now >= session.expiresAt) {
      markOAuthSessionNeedsReauth(db, provider, now);
      return { ok: false, reason: "reauth_required" };
    }
    return { ok: true, accessToken: session.accessToken, refreshed: false };
  }

  if (!Object.hasOwn(OAUTH_REFRESH_ENDPOINTS, provider)) {
    return { ok: false, reason: "unsupported_provider" };
  }
  const endpoint = OAUTH_REFRESH_ENDPOINTS[provider];
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  const run = performRefresh(
    db,
    masterKey,
    provider,
    origin,
    session,
    endpoint,
    fetchImpl,
    now,
  ).finally(() => {
    if (inFlightRefreshes.get(provider) === run) {
      inFlightRefreshes.delete(provider);
    }
  });

  inFlightRefreshes.set(provider, run);
  return run;
}
