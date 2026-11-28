import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openLocalStore } from "../../shared/local-store/local-store.ts";
import {
  deleteOAuthSession,
  listOAuthSessionSummaries,
  markOAuthSessionNeedsReauth,
  MAX_OAUTH_SESSION_BYTES,
  OAUTH_SESSION_AAD_PREFIX,
  readOAuthSession,
  readOrCreateOAuthHostIdentity,
  saveOAuthClientId,
  saveOAuthSession,
} from "./oauth-session-repository.ts";
import { migrateKeyVault } from "./provider-key-repository.ts";
import { openKey } from "./vault-crypto.ts";

const ORIGIN = "https://api.openai.com";
const LONG_ACCESS_TOKEN = `eyJ.${"a".repeat(900)}.sig`;
const REFRESH_TOKEN = "rt_super_secret_refresh_token_12345";

function withVault(
  run: (ctx: {
    db: ReturnType<typeof openLocalStore>;
    masterKey: Buffer;
    dir: string;
  }) => void,
) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-oauth-vault-"));
  const db = openLocalStore(dir);
  try {
    migrateKeyVault(db);
    run({ db, masterKey: randomBytes(32), dir });
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("saves and reads back an OAuth session including long JWT tokens", () => {
  withVault(({ db, masterKey }) => {
    const summary = saveOAuthSession(
      db,
      masterKey,
      {
        provider: "chatgpt",
        origin: ORIGIN,
        session: {
          accessToken: LONG_ACCESS_TOKEN,
          refreshToken: REFRESH_TOKEN,
          expiresAt: 2_000_000,
          clientId: "oaiapp_123",
          hostId: "host-uuid-1",
          accountLabel: "Plus",
        },
      },
      1_000_000,
    );
    assert.deepEqual(summary, {
      provider: "chatgpt",
      origin: ORIGIN,
      updatedAt: 1_000_000,
      expiresAt: 2_000_000,
      needsReauth: false,
      accountLabel: "Plus",
    });
    const secret = readOAuthSession(db, masterKey, "chatgpt", ORIGIN);
    assert.deepEqual(secret, {
      accessToken: LONG_ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
      expiresAt: 2_000_000,
      clientId: "oaiapp_123",
      hostId: "host-uuid-1",
      accountLabel: "Plus",
      needsReauth: false,
    });
  });
});

test("enforces 16 KB limit on serialized session payload without leaking tokens", () => {
  withVault(({ db, masterKey }) => {
    const oversized = "tok_" + "x".repeat(MAX_OAUTH_SESSION_BYTES);
    assert.throws(
      () =>
        saveOAuthSession(db, masterKey, {
          provider: "chatgpt",
          origin: ORIGIN,
          session: { accessToken: oversized, expiresAt: null },
        }),
      (error: Error) => {
        assert.equal(error.message, "oauth_session_too_large");
        assert.ok(!error.message.includes(oversized));
        return true;
      },
    );
  });
});

test("uses openbot-oauth-session AAD and blocks tampering or cross-origin moves", () => {
  withVault(({ db, masterKey }) => {
    saveOAuthSession(db, masterKey, {
      provider: "chatgpt",
      origin: ORIGIN,
      session: { accessToken: LONG_ACCESS_TOKEN, expiresAt: null },
    });
    const row = db
      .prepare(
        "SELECT iv, tag, ciphertext FROM oauth_sessions WHERE provider = 'chatgpt'",
      )
      .get() as { iv: Uint8Array; tag: Uint8Array; ciphertext: Uint8Array };
    const sealed = {
      iv: Buffer.from(row.iv),
      tag: Buffer.from(row.tag),
      ciphertext: Buffer.from(row.ciphertext),
    };
    assert.equal(openKey(masterKey, "chatgpt", ORIGIN, sealed), undefined);
    assert.ok(
      openKey(masterKey, "chatgpt", ORIGIN, sealed, OAUTH_SESSION_AAD_PREFIX),
    );
    assert.equal(
      readOAuthSession(db, randomBytes(32), "chatgpt", ORIGIN),
      undefined,
    );
    assert.equal(
      readOAuthSession(db, masterKey, "chatgpt", "https://evil.example"),
      undefined,
    );
    db.exec(
      "UPDATE oauth_sessions SET origin = 'https://evil.example' WHERE provider = 'chatgpt'",
    );
    assert.equal(
      readOAuthSession(db, masterKey, "chatgpt", "https://evil.example"),
      undefined,
    );
  });
});

test("lists summaries without secrets and marks needs_reauth cleanly", () => {
  withVault(({ db, masterKey }) => {
    saveOAuthSession(
      db,
      masterKey,
      {
        provider: "chatgpt",
        origin: ORIGIN,
        session: {
          accessToken: LONG_ACCESS_TOKEN,
          refreshToken: REFRESH_TOKEN,
          expiresAt: 5000,
          accountLabel: "Pro",
        },
      },
      1000,
    );
    markOAuthSessionNeedsReauth(db, "chatgpt", 2000);
    const summaries = listOAuthSessionSummaries(db);
    assert.deepEqual(summaries, [
      {
        provider: "chatgpt",
        origin: ORIGIN,
        updatedAt: 2000,
        expiresAt: 5000,
        needsReauth: true,
        accountLabel: "Pro",
      },
    ]);
    const serialized = JSON.stringify(summaries);
    assert.ok(!serialized.includes(LONG_ACCESS_TOKEN));
    assert.ok(!serialized.includes(REFRESH_TOKEN));
    const secret = readOAuthSession(db, masterKey, "chatgpt", ORIGIN);
    assert.equal(secret?.needsReauth, true);
    assert.equal(secret?.accessToken, LONG_ACCESS_TOKEN);
  });
});

test("deletes an OAuth session", () => {
  withVault(({ db, masterKey }) => {
    saveOAuthSession(db, masterKey, {
      provider: "chatgpt",
      origin: ORIGIN,
      session: { accessToken: LONG_ACCESS_TOKEN, expiresAt: null },
    });
    deleteOAuthSession(db, "chatgpt");
    assert.deepEqual(listOAuthSessionSummaries(db), []);
    assert.equal(readOAuthSession(db, masterKey, "chatgpt", ORIGIN), undefined);
  });
});

test("persists host_id and dynamic client_id in oauth_client_identities", () => {
  withVault(({ db }) => {
    const first = readOrCreateOAuthHostIdentity(db, "chatgpt", 100);
    assert.ok(first.hostId.length > 0);
    assert.equal(first.clientId, null);

    const second = readOrCreateOAuthHostIdentity(db, "chatgpt", 200);
    assert.equal(second.hostId, first.hostId);

    const withClient = saveOAuthClientId(db, "chatgpt", "oaiapp_abc123", 300);
    assert.equal(withClient.hostId, first.hostId);
    assert.equal(withClient.clientId, "oaiapp_abc123");
    assert.equal(withClient.updatedAt, 300);

    const reloaded = readOrCreateOAuthHostIdentity(db, "chatgpt", 400);
    assert.equal(reloaded.hostId, first.hostId);
    assert.equal(reloaded.clientId, "oaiapp_abc123");
  });
});

test("database files on disk never contain plaintext tokens", () => {
  withVault(({ db, masterKey, dir }) => {
    saveOAuthSession(db, masterKey, {
      provider: "chatgpt",
      origin: ORIGIN,
      session: {
        accessToken: LONG_ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        expiresAt: null,
      },
    });
    const file = join(dir, "openbot.db");
    const files = [file, `${file}-wal`].filter((path) => existsSync(path));
    assert.ok(files.length >= 1);
    for (const path of files) {
      const content = readFileSync(path);
      assert.equal(content.includes(Buffer.from(LONG_ACCESS_TOKEN)), false);
      assert.equal(content.includes(Buffer.from(REFRESH_TOKEN)), false);
    }
  });
});
