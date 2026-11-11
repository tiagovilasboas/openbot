import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../shared/local-store/migrate.ts";
import { openKey, sealKey } from "./vault-crypto.ts";
import { validateOrigin } from "./vault-validation.ts";

export const KEY_VAULT_DOMAIN = "key-vault";

export const KEY_VAULT_MIGRATIONS: readonly MigrationStep[] = [
  `CREATE TABLE provider_keys (
    provider TEXT PRIMARY KEY,
    origin TEXT NOT NULL,
    iv BLOB,
    tag BLOB,
    ciphertext BLOB,
    updated_at INTEGER NOT NULL
  )`,
];

export function migrateKeyVault(db: DatabaseSync): void {
  migrate(db, KEY_VAULT_DOMAIN, KEY_VAULT_MIGRATIONS);
}

export type ProviderKeyInput = {
  provider: string;
  origin: string;
  key: string;
};
export type ProviderKeySummary = {
  provider: string;
  origin: string;
  updatedAt: number;
};

type Row = {
  provider: string;
  origin: string;
  iv: Uint8Array | null;
  tag: Uint8Array | null;
  ciphertext: Uint8Array | null;
  updated_at: number;
};

// Inputs are already validated and normalized by the caller.
export function saveProviderKey(
  db: DatabaseSync,
  masterKey: Buffer,
  input: ProviderKeyInput,
  now: number = Date.now(),
): ProviderKeySummary {
  const sealed = sealKey(masterKey, input.provider, input.origin, input.key);
  db.prepare(
    `INSERT INTO provider_keys (provider, origin, iv, tag, ciphertext, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider) DO UPDATE SET origin = excluded.origin,
       iv = excluded.iv, tag = excluded.tag,
       ciphertext = excluded.ciphertext, updated_at = excluded.updated_at`,
  ).run(
    input.provider,
    input.origin,
    sealed.iv,
    sealed.tag,
    sealed.ciphertext,
    now,
  );
  return { provider: input.provider, origin: input.origin, updatedAt: now };
}

// Never selects iv, tag or ciphertext.
export function listProviderKeys(db: DatabaseSync): ProviderKeySummary[] {
  const rows = db
    .prepare(
      "SELECT provider, origin, updated_at FROM provider_keys ORDER BY provider",
    )
    .all() as Pick<Row, "provider" | "origin" | "updated_at">[];
  return rows.map((row) => ({
    provider: row.provider,
    origin: row.origin,
    updatedAt: row.updated_at,
  }));
}

export function deleteProviderKey(db: DatabaseSync, provider: string): void {
  db.prepare("DELETE FROM provider_keys WHERE provider = ?").run(provider);
}

// For model adapters: the key only comes back for the exact stored origin.
export function readProviderKey(
  db: DatabaseSync,
  masterKey: Buffer,
  provider: string,
  origin: string,
): string | undefined {
  const requested = validateOrigin(origin);
  if (!requested.ok) return undefined;
  const row = db
    .prepare("SELECT * FROM provider_keys WHERE provider = ?")
    .get(provider) as Row | undefined;
  if (!row || row.origin !== requested.value) return undefined;
  if (!row.iv || !row.tag || !row.ciphertext) return undefined;
  return openKey(masterKey, row.provider, row.origin, {
    iv: Buffer.from(row.iv),
    tag: Buffer.from(row.tag),
    ciphertext: Buffer.from(row.ciphertext),
  });
}
