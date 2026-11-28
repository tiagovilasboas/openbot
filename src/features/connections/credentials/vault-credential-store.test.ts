import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import type { VaultContext } from "../../key-vault/keys-handler.ts";
import { readOAuthSession } from "../../key-vault/oauth-session-repository.ts";
import {
  migrateKeyVault,
  readProviderKey,
} from "../../key-vault/provider-key-repository.ts";
import {
  createVaultClientIdentityStore,
  createVaultCredentialStore,
  keepsCredential,
} from "./vault-credential-store.ts";

const KEY = "sk-or-v1-OAUTH-SECRET-0123456789";

// A throwaway vault in a temp dir: never the user's ~/.openbot.
async function withVault(run: (context: VaultContext) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-connections-"));
  const db = openLocalStore(dir);
  try {
    migrateKeyVault(db);
    await run({ db, masterKey: randomBytes(32) });
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a saved router credential is read back by models for openrouter.ai", async () => {
  await withVault(async (context) => {
    const store = createVaultCredentialStore(() => context);
    await store.save("router", { kind: "api-key", secret: KEY });
    assert.equal(
      readProviderKey(
        context.db,
        context.masterKey,
        "router",
        "https://openrouter.ai",
      ),
      KEY,
    );
    const status = await store.status("router");
    assert.equal(status.connected, true);
    assert.equal(typeof status.updatedAt, "number");
  });
});

test("a saved chatgpt oauth-session is stored in oauth_sessions and status returns non-secret fields", async () => {
  await withVault(async (context) => {
    const store = createVaultCredentialStore(() => context);
    await store.save("chatgpt", {
      kind: "oauth-session",
      accessToken: "at_secret_token",
      refreshToken: "rt_secret_token",
      expiresAt: 2_000_000,
      clientId: "oaiapp_123",
      hostId: "host-1",
      accountLabel: "tiago@example.com",
    });

    const session = readOAuthSession(
      context.db,
      context.masterKey,
      "chatgpt",
      "https://api.openai.com",
    );
    assert.equal(session?.accessToken, "at_secret_token");
    assert.equal(session?.refreshToken, "rt_secret_token");

    const status = await store.status("chatgpt");
    assert.equal(status.connected, true);
    assert.equal(typeof status.updatedAt, "number");
    assert.equal(status.expiresAt, 2_000_000);
    assert.equal(status.needsReauth, false);
    assert.equal(status.accountLabel, "tiago@example.com");
    assert.ok(!JSON.stringify(status).includes("at_secret_token"));
    assert.ok(!JSON.stringify(status).includes("rt_secret_token"));

    await store.remove("chatgpt");
    assert.deepEqual(await store.status("chatgpt"), {
      connected: false,
      updatedAt: null,
    });
  });
});

test("disconnect removes the credential and can repeat", async () => {
  await withVault(async (context) => {
    const store = createVaultCredentialStore(() => context);
    await store.save("router", { kind: "api-key", secret: KEY });
    await store.remove("router");
    await store.remove("router");
    assert.deepEqual(await store.status("router"), {
      connected: false,
      updatedAt: null,
    });
  });
});

test("a credential the vault rules refuse is not saved", async () => {
  await withVault(async (context) => {
    const store = createVaultCredentialStore(() => context);
    await assert.rejects(
      store.save("router", { kind: "api-key", secret: "has space" }),
      (error: Error) => {
        assert.ok(!error.message.includes("has space"));
        return true;
      },
    );
    assert.equal((await store.status("router")).connected, false);
  });
});

test("only connections the vault keeps have a slot and kind must match", async () => {
  assert.equal(keepsCredential("router"), true);
  assert.equal(keepsCredential("anthropic"), true);
  assert.equal(keepsCredential("chatgpt"), true);
  assert.equal(keepsCredential("github"), false);
  const store = createVaultCredentialStore(() => {
    throw new Error("the vault is not touched");
  });
  await assert.rejects(
    store.save("github", { kind: "api-key", secret: KEY }),
    /no vault slot/,
  );
  await assert.rejects(
    store.save("chatgpt", { kind: "api-key", secret: KEY }),
    /invalid credential kind/,
  );
  await assert.rejects(
    store.save("router", {
      kind: "oauth-session",
      accessToken: "at",
      expiresAt: null,
    }),
    /invalid credential kind/,
  );
});

test("client identity store persists host_id and client_id in vault", async () => {
  await withVault(async (context) => {
    const identities = createVaultClientIdentityStore(() => context);
    const hostId = identities.readOrCreateHostId("chatgpt");
    assert.ok(hostId.length > 0);
    assert.equal(identities.readOrCreateHostId("chatgpt"), hostId);
    assert.equal(identities.readClientId("chatgpt"), null);

    identities.saveClientId("chatgpt", "oaiapp_abc");
    assert.equal(identities.readClientId("chatgpt"), "oaiapp_abc");
    assert.throws(
      () => identities.readOrCreateHostId("router"),
      /no oauth identity slot/,
    );
  });
});
