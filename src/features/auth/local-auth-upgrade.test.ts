import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PBKDF2_ITERATIONS,
  LEGACY_PBKDF2_ITERATIONS,
  createCredentials,
  upgradeCredentials,
  verifyPassword,
} from "./local-auth.ts";

test("new passwords use 600000 iterations and store the count", async () => {
  assert.equal(DEFAULT_PBKDF2_ITERATIONS, 600_000);
  const creds = await createCredentials("new-pin-9");
  assert.equal(creds.iterations, 600_000);
  assert.equal(await verifyPassword("new-pin-9", creds), true);
  assert.equal(await verifyPassword("wrong", creds), false);
});

test("old 100000-iteration credentials still verify with their stored count", async () => {
  const old = await createCredentials("old-pin-1", "hint", 100_000);
  assert.equal(old.iterations, LEGACY_PBKDF2_ITERATIONS);
  assert.equal(await verifyPassword("old-pin-1", old), true);
  assert.equal(await verifyPassword("nope", old), false);
});

test("credentials without a stored count verify as legacy", async () => {
  const old = await createCredentials("legacy-pin", undefined, 100_000);
  const noCount = { ...old, iterations: 0 };
  assert.equal(await verifyPassword("legacy-pin", noCount), true);
});

test("upgrade re-hashes old credentials and keeps hint and createdAt", async () => {
  const old = await createCredentials("old-pin-1", "my hint", 1000);
  const upgraded = await upgradeCredentials("old-pin-1", old, 2000);
  assert.ok(upgraded);
  assert.equal(upgraded.iterations, 2000);
  assert.equal(upgraded.hint, "my hint");
  assert.equal(upgraded.createdAt, old.createdAt);
  assert.notEqual(upgraded.salt, old.salt);
  assert.notEqual(upgraded.hash, old.hash);
  assert.equal(await verifyPassword("old-pin-1", upgraded), true);
  assert.equal(await verifyPassword("wrong", upgraded), false);
});

test("upgrade does nothing for credentials already at the target", async () => {
  const strong = await createCredentials("pin-1234", undefined, 2000);
  assert.equal(await upgradeCredentials("pin-1234", strong, 2000), null);
  assert.equal(await upgradeCredentials("pin-1234", strong, 1000), null);
});

test("a wrong password never yields upgraded credentials", async () => {
  const old = await createCredentials("right-pin", undefined, 1000);
  assert.equal(await verifyPassword("wrong-pin", old), false);
});
