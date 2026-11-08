import assert from "node:assert/strict";
import test from "node:test";
import {
  bytesToHex,
  constantTimeEqual,
  createCredentials,
  generateSalt,
  hexToBytes,
  verifyPassword,
} from "./local-auth.ts";

test("bytesToHex and hexToBytes correctly round-trip byte arrays", () => {
  const original = new Uint8Array([0, 15, 16, 255, 128, 42]);
  const hex = bytesToHex(original);
  assert.equal(hex, "000f10ff802a");
  const parsed = hexToBytes(hex);
  assert.deepEqual(parsed, original);
});

test("constantTimeEqual checks byte equality correctly", () => {
  const a = new Uint8Array([1, 2, 3, 4]);
  const b = new Uint8Array([1, 2, 3, 4]);
  const c = new Uint8Array([1, 2, 3, 5]);
  const d = new Uint8Array([1, 2, 3]);

  assert.equal(constantTimeEqual(a, b), true);
  assert.equal(constantTimeEqual(a, c), false);
  assert.equal(constantTimeEqual(a, d), false);
});

test("generateSalt creates unique hex salts", () => {
  const salt1 = generateSalt(16);
  const salt2 = generateSalt(16);

  assert.equal(salt1.length, 32);
  assert.equal(salt2.length, 32);
  assert.notEqual(salt1, salt2);
});

test("createCredentials and verifyPassword authenticate offline with PBKDF2", async () => {
  // Use lower iterations for fast unit test
  const creds = await createCredentials(
    "super-secret-pin-42",
    "favorite number",
    1000,
  );

  assert.equal(typeof creds.salt, "string");
  assert.equal(typeof creds.hash, "string");
  assert.equal(creds.hint, "favorite number");
  assert.equal(creds.iterations, 1000);

  // Correct password verification
  const isMatch = await verifyPassword("super-secret-pin-42", creds);
  assert.equal(isMatch, true);

  // Incorrect password rejection
  const isWrong = await verifyPassword("wrong-password", creds);
  assert.equal(isWrong, false);

  // Empty password rejection
  const isEmpty = await verifyPassword("", creds);
  assert.equal(isEmpty, false);
});
