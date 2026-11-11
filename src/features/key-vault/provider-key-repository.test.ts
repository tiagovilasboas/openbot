import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openLocalStore } from "../../shared/local-store/local-store.ts";
import {
  deleteProviderKey,
  listProviderKeys,
  migrateKeyVault,
  readProviderKey,
  saveProviderKey,
} from "./provider-key-repository.ts";

const ORIGIN = "https://openrouter.ai";
const SECRET = "sk-or-v1-TOP-SECRET-0123456789";

function withVault(
  run: (ctx: {
    db: ReturnType<typeof openLocalStore>;
    masterKey: Buffer;
    dir: string;
  }) => void,
) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-vault-"));
  const db = openLocalStore(dir);
  try {
    migrateKeyVault(db);
    run({ db, masterKey: randomBytes(32), dir });
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a saved key round-trips for its provider and origin", () => {
  withVault(({ db, masterKey }) => {
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: ORIGIN,
      key: SECRET,
    });
    assert.equal(readProviderKey(db, masterKey, "router", ORIGIN), SECRET);
    assert.equal(
      readProviderKey(db, masterKey, "router", "https://openrouter.ai/api/v1"),
      SECRET,
    );
  });
});

test("saving again replaces the key and the origin", () => {
  withVault(({ db, masterKey }) => {
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: ORIGIN,
      key: SECRET,
    });
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: "https://other.example.com",
      key: "second",
    });
    assert.equal(readProviderKey(db, masterKey, "router", ORIGIN), undefined);
    assert.equal(
      readProviderKey(db, masterKey, "router", "https://other.example.com"),
      "second",
    );
    assert.equal(listProviderKeys(db).length, 1);
  });
});

test("a different origin gets no key", () => {
  withVault(({ db, masterKey }) => {
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: ORIGIN,
      key: SECRET,
    });
    for (const other of [
      "https://evil.example.com",
      "http://openrouter.ai",
      "https://openrouter.ai:8443",
      "nonsense",
    ]) {
      assert.equal(readProviderKey(db, masterKey, "router", other), undefined);
    }
    assert.equal(
      readProviderKey(db, masterKey, "anthropic", ORIGIN),
      undefined,
    );
  });
});

test("a wrong master key yields no key", () => {
  withVault(({ db, masterKey }) => {
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: ORIGIN,
      key: SECRET,
    });
    assert.equal(
      readProviderKey(db, randomBytes(32), "router", ORIGIN),
      undefined,
    );
  });
});

test("a ciphertext moved to another provider or origin fails to decrypt", () => {
  withVault(({ db, masterKey }) => {
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: ORIGIN,
      key: SECRET,
    });
    db.exec(
      `INSERT INTO provider_keys SELECT 'anthropic', origin, iv, tag, ciphertext, updated_at FROM provider_keys WHERE provider = 'router'`,
    );
    assert.equal(
      readProviderKey(db, masterKey, "anthropic", ORIGIN),
      undefined,
    );
    db.exec(
      "UPDATE provider_keys SET origin = 'https://evil.example.com' WHERE provider = 'router'",
    );
    assert.equal(
      readProviderKey(db, masterKey, "router", "https://evil.example.com"),
      undefined,
    );
  });
});

test("a tampered ciphertext yields no key", () => {
  withVault(({ db, masterKey }) => {
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: ORIGIN,
      key: SECRET,
    });
    db.exec("UPDATE provider_keys SET ciphertext = x'00112233'");
    assert.equal(readProviderKey(db, masterKey, "router", ORIGIN), undefined);
  });
});

test("each write uses a fresh IV", () => {
  withVault(({ db, masterKey }) => {
    const ivs = new Set<string>();
    for (let i = 0; i < 5; i += 1) {
      saveProviderKey(db, masterKey, {
        provider: "router",
        origin: ORIGIN,
        key: SECRET,
      });
      const row = db.prepare("SELECT iv FROM provider_keys").get() as {
        iv: Uint8Array;
      };
      assert.equal(row.iv.length, 12);
      ivs.add(Buffer.from(row.iv).toString("hex"));
    }
    assert.equal(ivs.size, 5);
  });
});

test("listing never exposes values", () => {
  withVault(({ db, masterKey }) => {
    saveProviderKey(
      db,
      masterKey,
      { provider: "router", origin: ORIGIN, key: SECRET },
      1700,
    );
    saveProviderKey(db, masterKey, {
      provider: "anthropic",
      origin: "https://api.anthropic.com",
      key: "sk-ant-ANOTHER-SECRET",
    });
    const listed = listProviderKeys(db);
    assert.equal(listed.length, 2);
    assert.deepEqual(Object.keys(listed[0]).sort(), [
      "origin",
      "provider",
      "updatedAt",
    ]);
    const json = JSON.stringify(listed);
    assert.ok(!json.includes(SECRET));
    assert.ok(!json.includes("ANOTHER-SECRET"));
    assert.equal(listed.find((k) => k.provider === "router")?.updatedAt, 1700);
  });
});

test("deleting removes the key", () => {
  withVault(({ db, masterKey }) => {
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: ORIGIN,
      key: SECRET,
    });
    deleteProviderKey(db, "router");
    deleteProviderKey(db, "router");
    assert.deepEqual(listProviderKeys(db), []);
    assert.equal(readProviderKey(db, masterKey, "router", ORIGIN), undefined);
  });
});

test("the database files on disk never contain the plaintext key", () => {
  withVault(({ db, masterKey, dir }) => {
    saveProviderKey(db, masterKey, {
      provider: "router",
      origin: ORIGIN,
      key: SECRET,
    });
    const file = join(dir, "openbot.db");
    const files = [file, `${file}-wal`].filter((path) => existsSync(path));
    assert.ok(files.length >= 1);
    for (const path of files) {
      assert.equal(readFileSync(path).includes(Buffer.from(SECRET)), false);
    }
    // The WAL is where fresh writes land; make sure we really inspected it.
    assert.ok(
      files.some((path) => readFileSync(path).includes(Buffer.from(ORIGIN))),
    );
  });
});
