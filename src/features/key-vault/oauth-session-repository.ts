import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { openKey, sealKey } from "./vault-crypto.ts";
import { validateOrigin } from "./vault-validation.ts";

export const OAUTH_SESSION_AAD_PREFIX = "openbot-oauth-session:v1";
export const MAX_OAUTH_SESSION_BYTES = 16 * 1024;

export type OAuthSessionSecret = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number | null;
  clientId?: string;
  hostId?: string;
  accountLabel?: string | null;
  needsReauth?: boolean;
};

export type OAuthSessionSummary = {
  provider: string;
  origin: string;
  updatedAt: number;
  expiresAt: number | null;
  needsReauth: boolean;
  accountLabel: string | null;
};

export type OAuthSessionInput = {
  provider: string;
  origin: string;
  session: OAuthSessionSecret;
};

export type OAuthClientIdentity = {
  provider: string;
  hostId: string;
  clientId: string | null;
  updatedAt: number;
};

type SessionRow = {
  provider: string;
  origin: string;
  iv: Uint8Array;
  tag: Uint8Array;
  ciphertext: Uint8Array;
  expires_at: number | null;
  needs_reauth: number;
  account_label: string | null;
  updated_at: number;
};

type SummaryRow = Pick<
  SessionRow,
  | "provider"
  | "origin"
  | "expires_at"
  | "needs_reauth"
  | "account_label"
  | "updated_at"
>;

type IdentityRow = {
  provider: string;
  host_id: string;
  client_id: string | null;
  updated_at: number;
};

function requireProvider(provider: string): string {
  const trimmed = provider.trim();
  if (!trimmed || /[\p{Cc}\s]/u.test(trimmed)) {
    throw new Error("invalid_provider");
  }
  return trimmed;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function normalizeSecret(
  raw: Record<string, unknown>,
): OAuthSessionSecret | undefined {
  const accessToken = nonEmptyString(raw.accessToken);
  if (!accessToken) return undefined;
  const refreshToken = nonEmptyString(raw.refreshToken);
  const clientId = nonEmptyString(raw.clientId);
  const hostId = nonEmptyString(raw.hostId);
  return {
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
    expiresAt: finiteOrNull(raw.expiresAt),
    ...(clientId ? { clientId } : {}),
    ...(hostId ? { hostId } : {}),
    accountLabel:
      typeof raw.accountLabel === "string" ? raw.accountLabel : null,
    needsReauth: raw.needsReauth === true,
  };
}

function parseSessionSecret(plaintext: string): OAuthSessionSecret | undefined {
  try {
    const parsed: unknown = JSON.parse(plaintext);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return undefined;
    }
    return normalizeSecret(parsed as Record<string, unknown>);
  } catch {
    return undefined;
  }
}

function toIdentity(row: IdentityRow): OAuthClientIdentity {
  return {
    provider: row.provider,
    hostId: row.host_id,
    clientId: row.client_id ?? null,
    updatedAt: row.updated_at,
  };
}

export function saveOAuthSession(
  db: DatabaseSync,
  masterKey: Buffer,
  input: OAuthSessionInput,
  now: number = Date.now(),
): OAuthSessionSummary {
  const provider = requireProvider(input.provider);
  const origin = validateOrigin(input.origin);
  if (!origin.ok) throw new Error(origin.code);
  const payload = normalizeSecret(input.session as Record<string, unknown>);
  if (!payload) throw new Error("invalid_access_token");

  const serialized = JSON.stringify(payload);
  if (Buffer.byteLength(serialized, "utf8") > MAX_OAUTH_SESSION_BYTES) {
    throw new Error("oauth_session_too_large");
  }

  const sealed = sealKey(
    masterKey,
    provider,
    origin.value,
    serialized,
    OAUTH_SESSION_AAD_PREFIX,
  );
  const accountLabel = payload.accountLabel ?? null;
  const needsReauth = payload.needsReauth === true;

  db.prepare(
    `INSERT INTO oauth_sessions
       (provider, origin, iv, tag, ciphertext, expires_at, needs_reauth, account_label, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET
       origin = excluded.origin, iv = excluded.iv, tag = excluded.tag,
       ciphertext = excluded.ciphertext, expires_at = excluded.expires_at,
       needs_reauth = excluded.needs_reauth, account_label = excluded.account_label,
       updated_at = excluded.updated_at`,
  ).run(
    provider,
    origin.value,
    sealed.iv,
    sealed.tag,
    sealed.ciphertext,
    payload.expiresAt,
    needsReauth ? 1 : 0,
    accountLabel,
    now,
  );

  return {
    provider,
    origin: origin.value,
    updatedAt: now,
    expiresAt: payload.expiresAt,
    needsReauth,
    accountLabel,
  };
}

export function readOAuthSession(
  db: DatabaseSync,
  masterKey: Buffer,
  provider: string,
  origin: string,
): OAuthSessionSecret | undefined {
  const requested = validateOrigin(origin);
  if (!requested.ok) return undefined;
  const row = db
    .prepare("SELECT * FROM oauth_sessions WHERE provider = ?")
    .get(provider) as SessionRow | undefined;
  if (!row || row.origin !== requested.value) return undefined;
  const plaintext = openKey(
    masterKey,
    row.provider,
    row.origin,
    {
      iv: Buffer.from(row.iv),
      tag: Buffer.from(row.tag),
      ciphertext: Buffer.from(row.ciphertext),
    },
    OAUTH_SESSION_AAD_PREFIX,
  );
  if (!plaintext) return undefined;
  const parsed = parseSessionSecret(plaintext);
  if (!parsed) return undefined;
  return {
    ...parsed,
    needsReauth: Boolean(row.needs_reauth) || Boolean(parsed.needsReauth),
    accountLabel: row.account_label ?? parsed.accountLabel ?? null,
    expiresAt: parsed.expiresAt ?? row.expires_at ?? null,
  };
}

// Never selects iv, tag, or ciphertext.
export function listOAuthSessionSummaries(
  db: DatabaseSync,
): OAuthSessionSummary[] {
  const rows = db
    .prepare(
      `SELECT provider, origin, expires_at, needs_reauth, account_label, updated_at
       FROM oauth_sessions ORDER BY provider`,
    )
    .all() as SummaryRow[];
  return rows.map((row) => ({
    provider: row.provider,
    origin: row.origin,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at ?? null,
    needsReauth: Boolean(row.needs_reauth),
    accountLabel: row.account_label ?? null,
  }));
}

export function deleteOAuthSession(db: DatabaseSync, provider: string): void {
  db.prepare("DELETE FROM oauth_sessions WHERE provider = ?").run(provider);
}

export function markOAuthSessionNeedsReauth(
  db: DatabaseSync,
  provider: string,
  now: number = Date.now(),
): void {
  db.prepare(
    "UPDATE oauth_sessions SET needs_reauth = 1, updated_at = ? WHERE provider = ?",
  ).run(now, provider);
}

export function readOrCreateOAuthHostIdentity(
  db: DatabaseSync,
  provider: string,
  now: number = Date.now(),
): OAuthClientIdentity {
  const cleanProvider = requireProvider(provider);
  const existing = db
    .prepare("SELECT * FROM oauth_client_identities WHERE provider = ?")
    .get(cleanProvider) as IdentityRow | undefined;
  if (existing) return toIdentity(existing);
  db.prepare(
    `INSERT INTO oauth_client_identities (provider, host_id, client_id, updated_at)
     VALUES (?, ?, NULL, ?)
     ON CONFLICT(provider) DO NOTHING`,
  ).run(cleanProvider, randomUUID(), now);
  return toIdentity(
    db
      .prepare("SELECT * FROM oauth_client_identities WHERE provider = ?")
      .get(cleanProvider) as IdentityRow,
  );
}

export function saveOAuthClientId(
  db: DatabaseSync,
  provider: string,
  clientId: string,
  now: number = Date.now(),
): OAuthClientIdentity {
  const cleanProvider = requireProvider(provider);
  const trimmedClientId = clientId.trim();
  if (!trimmedClientId) throw new Error("invalid_client_id");
  const current = readOrCreateOAuthHostIdentity(db, cleanProvider, now);
  db.prepare(
    "UPDATE oauth_client_identities SET client_id = ?, updated_at = ? WHERE provider = ?",
  ).run(trimmedClientId, now, cleanProvider);
  return { ...current, clientId: trimmedClientId, updatedAt: now };
}
