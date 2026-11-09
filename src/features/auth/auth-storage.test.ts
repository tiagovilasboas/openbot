import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  AUTH_STORAGE_KEY,
  SESSION_LOCK_KEY,
  clearCredentials,
  getAuthSnapshot,
  getServerAuthSnapshot,
  isSessionUnlocked,
  loadCredentials,
  saveCredentials,
  setSessionUnlocked,
  subscribeAuth,
} from "./auth-storage.ts";
import type { LocalAuthCredentials } from "./auth-types.ts";
import { createCredentials, verifyPassword } from "./local-auth.ts";

const win = globalThis as { window?: unknown };

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error("blocked");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

type Fake = ReturnType<typeof fakeStorage>;
let local: Fake;
let session: Fake;
let windowListeners: Map<string, Set<() => void>>;

function installWindow(overrides: Record<string, unknown> = {}) {
  windowListeners = new Map();
  win.window = {
    localStorage: local,
    sessionStorage: session,
    addEventListener: (type: string, fn: () => void) => {
      const set = windowListeners.get(type) ?? new Set();
      set.add(fn);
      windowListeners.set(type, set);
    },
    removeEventListener: (type: string, fn: () => void) =>
      void windowListeners.get(type)?.delete(fn),
    ...overrides,
  };
}

beforeEach(() => {
  local = fakeStorage();
  session = fakeStorage();
  installWindow();
});
afterEach(() => {
  delete win.window;
});

const creds = (extra: Partial<LocalAuthCredentials> = {}) => ({
  salt: "ab",
  hash: "cd",
  iterations: 1000,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

test("without a window everything is inert and the snapshot is the server one", () => {
  delete win.window;
  assert.equal(loadCredentials(), null);
  assert.equal(isSessionUnlocked(), false);
  assert.doesNotThrow(() => saveCredentials(creds()));
  assert.doesNotThrow(() => clearCredentials());
  assert.doesNotThrow(() => setSessionUnlocked(true));
  assert.equal(getAuthSnapshot(), getServerAuthSnapshot());
});

test("saving credentials stores them, unlocks the session and notifies", () => {
  let notified = 0;
  const off = subscribeAuth(() => notified++);
  saveCredentials(creds({ hint: "pet" }));
  assert.equal(local.store.has(AUTH_STORAGE_KEY), true);
  assert.equal(session.store.get(SESSION_LOCK_KEY), "true");
  assert.equal(isSessionUnlocked(), true);
  assert.deepEqual(loadCredentials(), creds({ hint: "pet" }));
  assert.ok(notified >= 1);
  off();
});

test("clearing credentials removes them, locks the session and notifies", () => {
  saveCredentials(creds());
  let notified = 0;
  const off = subscribeAuth(() => notified++);
  clearCredentials();
  assert.equal(loadCredentials(), null);
  assert.equal(isSessionUnlocked(), false);
  assert.equal(local.store.has(AUTH_STORAGE_KEY), false);
  assert.ok(notified >= 1);
  off();
});

test("clearing when nothing is stored is harmless", () => {
  assert.doesNotThrow(() => clearCredentials());
  assert.equal(loadCredentials(), null);
});

test("corrupt or incomplete stored credentials are treated as no password", () => {
  const bad = [
    "{not json",
    "null",
    "42",
    '"text"',
    "[]",
    "{}",
    JSON.stringify({ salt: "a", hash: "b" }),
    JSON.stringify({ salt: 1, hash: "b", iterations: 10 }),
    JSON.stringify({ salt: "a", hash: 2, iterations: 10 }),
    JSON.stringify({ salt: "a", hash: "b", iterations: "10" }),
  ];
  for (const raw of bad) {
    local.store.set(AUTH_STORAGE_KEY, raw);
    assert.equal(loadCredentials(), null, raw);
    assert.equal(getAuthSnapshot().hasPassword, false, raw);
  }
});

test("a missing createdAt is filled and a non-string hint is dropped", () => {
  local.store.set(
    AUTH_STORAGE_KEY,
    JSON.stringify({ salt: "a", hash: "b", iterations: 5, hint: 9 }),
  );
  const loaded = loadCredentials();
  assert.ok(loaded);
  assert.equal(loaded.hint, undefined);
  assert.ok(!Number.isNaN(Date.parse(loaded.createdAt)));
});

test("storage that throws never breaks the loaders or writers", () => {
  installWindow({
    localStorage: throwingStorage(),
    sessionStorage: throwingStorage(),
  });
  assert.equal(loadCredentials(), null);
  assert.equal(isSessionUnlocked(), false);
  assert.doesNotThrow(() => saveCredentials(creds()));
  assert.doesNotThrow(() => clearCredentials());
  assert.doesNotThrow(() => setSessionUnlocked(true));
  assert.doesNotThrow(() => setSessionUnlocked(false));
});

test("a failed credentials write does not unlock the session", () => {
  installWindow({
    localStorage: {
      ...fakeStorage(),
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    },
  });
  saveCredentials(creds());
  assert.equal(isSessionUnlocked(), false);
});

test("the snapshot reports no password, locked, and unlocked states", () => {
  assert.deepEqual(getAuthSnapshot(), {
    hasPassword: false,
    isLocked: false,
    hint: null,
  });

  local.store.set(AUTH_STORAGE_KEY, JSON.stringify(creds({ hint: "pet" })));
  assert.deepEqual(getAuthSnapshot(), {
    hasPassword: true,
    isLocked: true,
    hint: "pet",
  });

  setSessionUnlocked(true);
  assert.deepEqual(getAuthSnapshot(), {
    hasPassword: true,
    isLocked: false,
    hint: "pet",
  });
});

test("an empty hint reads as null", () => {
  local.store.set(AUTH_STORAGE_KEY, JSON.stringify(creds({ hint: "" })));
  assert.equal(getAuthSnapshot().hint, null);
});

test("the snapshot keeps its reference while nothing changed", () => {
  local.store.set(AUTH_STORAGE_KEY, JSON.stringify(creds()));
  const first = getAuthSnapshot();
  assert.equal(getAuthSnapshot(), first);
  setSessionUnlocked(true);
  assert.notEqual(getAuthSnapshot(), first);
});

test("subscribeAuth listens to cross-tab storage events and unsubscribes cleanly", () => {
  let notified = 0;
  const listener = () => notified++;
  const off = subscribeAuth(listener);
  assert.equal(windowListeners.get("storage")?.has(listener), true);
  off();
  assert.equal(windowListeners.get("storage")?.has(listener), false);
  saveCredentials(creds());
  assert.equal(notified, 0);
});

test("a removed listener is not called but the others still are", () => {
  let a = 0;
  let b = 0;
  const offA = subscribeAuth(() => a++);
  const offB = subscribeAuth(() => b++);
  offA();
  setSessionUnlocked(true);
  assert.equal(a, 0);
  assert.equal(b, 1);
  offB();
});

test("setSessionUnlocked(false) removes the flag", () => {
  setSessionUnlocked(true);
  setSessionUnlocked(false);
  assert.equal(session.store.has(SESSION_LOCK_KEY), false);
  assert.equal(isSessionUnlocked(), false);
});

test("any value other than 'true' in the session flag stays locked", () => {
  session.store.set(SESSION_LOCK_KEY, "1");
  assert.equal(isSessionUnlocked(), false);
});

// --- end to end with the real hashing, low iteration count ------------------

test("a saved credential verifies the right password and rejects a wrong one", async () => {
  const created = await createCredentials("s3cret", "  pet  ", 1000);
  saveCredentials(created);
  const loaded = loadCredentials();
  assert.ok(loaded);
  assert.equal(loaded.hint, "pet");
  assert.equal(await verifyPassword("s3cret", loaded), true);
  assert.equal(await verifyPassword("S3cret", loaded), false);
  assert.equal(await verifyPassword("", loaded), false);
  assert.equal(await verifyPassword("s3cret ", loaded), false);
});

test("verifyPassword rejects corrupted salt, hash and iteration values", async () => {
  const good = await createCredentials("pw", undefined, 1000);
  const corrupted: LocalAuthCredentials[] = [
    { ...good, hash: "" },
    { ...good, hash: "zz" },
    { ...good, hash: good.hash.slice(0, -2) },
    { ...good, salt: "00".repeat(16) },
    { ...good, iterations: 999 },
    { ...good, iterations: -5 },
    { ...good, iterations: Number.NaN },
  ];
  for (const bad of corrupted) {
    assert.equal(await verifyPassword("pw", bad), false, JSON.stringify(bad));
  }
});

test("each credential gets its own salt and hash for the same password", async () => {
  const a = await createCredentials("same", undefined, 1000);
  const b = await createCredentials("same", undefined, 1000);
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  assert.equal("hint" in a, false);
});

test("a blank hint is not stored", async () => {
  const c = await createCredentials("pw", "   ", 1000);
  assert.equal("hint" in c, false);
});

test("a stored zero iteration count verifies against the default count", async () => {
  const good = await createCredentials("pw", undefined, 100_000);
  assert.equal(await verifyPassword("pw", { ...good, iterations: 0 }), true);
});
