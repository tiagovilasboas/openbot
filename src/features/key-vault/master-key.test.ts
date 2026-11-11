import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveMasterKey } from "./master-key.ts";

const mode = (path: string) => statSync(path).mode & 0o777;

function withTempDir(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-vault-key-"));
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the master key file is created private and then reused", () => {
  withTempDir((root) => {
    const dir = join(root, "data");
    const first = resolveMasterKey({ env: {}, dir });
    assert.equal(first.length, 32);
    const file = join(dir, "vault.key");
    assert.equal(mode(file), 0o600);
    const second = resolveMasterKey({ env: {}, dir });
    assert.ok(first.equals(second));
    assert.deepEqual(readdirSync(dir), ["vault.key"]);
  });
});

test("a looser key file mode is tightened on read", () => {
  withTempDir((dir) => {
    const first = resolveMasterKey({ env: {}, dir });
    const file = join(dir, "vault.key");
    chmodSync(file, 0o644);
    assert.ok(resolveMasterKey({ env: {}, dir }).equals(first));
    assert.equal(mode(file), 0o600);
  });
});

test("a corrupt key file is an error, not a silent new key", () => {
  withTempDir((dir) => {
    writeFileSync(join(dir, "vault.key"), "too-short", { mode: 0o600 });
    assert.throws(() => resolveMasterKey({ env: {}, dir }), /vault\.key/);
    assert.equal(readFileSync(join(dir, "vault.key"), "utf8"), "too-short");
  });
});

test("OPENBOT_VAULT_KEY wins and writes no file", () => {
  withTempDir((dir) => {
    const raw = randomBytes(32);
    const key = resolveMasterKey({
      env: { OPENBOT_VAULT_KEY: raw.toString("base64") },
      dir,
    });
    assert.ok(key.equals(raw));
    assert.deepEqual(readdirSync(dir), []);
  });
});

test("OPENBOT_VAULT_KEY must be base64 for exactly 32 bytes", () => {
  withTempDir((dir) => {
    const bad = [
      randomBytes(16).toString("base64"),
      randomBytes(33).toString("base64"),
      "not base64 at all!",
    ];
    for (const value of bad) {
      assert.throws(
        () => resolveMasterKey({ env: { OPENBOT_VAULT_KEY: value }, dir }),
        (error: Error) =>
          /OPENBOT_VAULT_KEY must be base64 for exactly 32 bytes/.test(
            error.message,
          ) && !error.message.includes(value),
      );
    }
  });
});
