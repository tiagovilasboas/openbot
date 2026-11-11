import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  AUTH_STORAGE_KEY,
  loadCredentials,
  saveCredentials,
} from "./auth-storage.ts";
import {
  CREDENTIAL_HEX_MAX,
  HINT_MAX_LENGTH,
  ITERATIONS_MAX,
  normalizeCredentials,
} from "./stored-credentials.ts";

const good = {
  salt: "ab".repeat(16),
  hash: "cd".repeat(32),
  iterations: 600_000,
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("real-shaped credentials pass", () => {
  assert.deepEqual(normalizeCredentials({ ...good, hint: "pet" }), {
    ...good,
    hint: "pet",
  });
});

test("an oversized salt or hash is rejected", () => {
  const big = "a".repeat(CREDENTIAL_HEX_MAX + 1);
  assert.equal(normalizeCredentials({ ...good, salt: big }), null);
  assert.equal(normalizeCredentials({ ...good, hash: big }), null);
});

test("a bad iteration count is rejected", () => {
  for (const iterations of [
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    ITERATIONS_MAX + 1,
    "10",
  ]) {
    assert.equal(
      normalizeCredentials({ ...good, iterations }),
      null,
      String(iterations),
    );
  }
});

test("a long hint is cut, not a reason to drop the lock", () => {
  const out = normalizeCredentials({ ...good, hint: "h".repeat(5000) });
  assert.equal(out?.hint?.length, HINT_MAX_LENGTH);
});

test("a long createdAt is cut", () => {
  const out = normalizeCredentials({ ...good, createdAt: "d".repeat(5000) });
  assert.equal(out?.createdAt.length, 40);
});

test("non-objects are rejected", () => {
  for (const raw of [null, 3, "x", [], undefined]) {
    assert.equal(normalizeCredentials(raw), null);
  }
});

const win = globalThis as { window?: unknown };
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  win.window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
});
afterEach(() => {
  delete win.window;
});

test("loading oversized stored credentials returns no lock", () => {
  store.set(
    AUTH_STORAGE_KEY,
    JSON.stringify({ ...good, hash: "a".repeat(1_000_000) }),
  );
  assert.equal(loadCredentials(), null);
});

test("loading caps a stored hint", () => {
  store.set(
    AUTH_STORAGE_KEY,
    JSON.stringify({ ...good, hint: "h".repeat(10_000) }),
  );
  assert.equal(loadCredentials()?.hint?.length, HINT_MAX_LENGTH);
});

test("saving never writes an oversized hint or an unreadable record", () => {
  saveCredentials({ ...good, hint: "h".repeat(10_000) });
  const stored = JSON.parse(store.get(AUTH_STORAGE_KEY) ?? "{}");
  assert.equal(stored.hint.length, HINT_MAX_LENGTH);

  store.clear();
  saveCredentials({ ...good, salt: "a".repeat(CREDENTIAL_HEX_MAX + 1) });
  assert.equal(store.has(AUTH_STORAGE_KEY), false);
});
