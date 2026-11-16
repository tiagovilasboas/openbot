import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import type { VaultContext } from "../../key-vault/keys-handler.ts";
import {
  migrateKeyVault,
  readProviderKey,
} from "../../key-vault/provider-key-repository.ts";
import {
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
    await store.save("router", KEY);
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

test("disconnect removes the credential and can repeat", async () => {
  await withVault(async (context) => {
    const store = createVaultCredentialStore(() => context);
    await store.save("router", KEY);
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
    await assert.rejects(store.save("router", "has space"), (error: Error) => {
      assert.ok(!error.message.includes("has space"));
      return true;
    });
    assert.equal((await store.status("router")).connected, false);
  });
});

test("only connections the vault keeps have a slot", async () => {
  assert.equal(keepsCredential("router"), true);
  assert.equal(keepsCredential("anthropic"), true);
  assert.equal(keepsCredential("github"), false);
  const store = createVaultCredentialStore(() => {
    throw new Error("the vault is not touched");
  });
  await assert.rejects(store.save("github", KEY), /no vault slot/);
});
