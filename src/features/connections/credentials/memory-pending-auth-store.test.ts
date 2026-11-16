import assert from "node:assert/strict";
import { test } from "node:test";
import type { PendingAuth } from "../core/index.ts";
import { createMemoryPendingAuthStore } from "./memory-pending-auth-store.ts";

const pendingAt = (createdAt: number): PendingAuth => ({
  id: "router",
  verifier: "v",
  createdAt,
});

test("take hands a pending Connect out once", () => {
  const store = createMemoryPendingAuthStore(() => 0, 1000);
  store.put("s1", pendingAt(0));
  assert.deepEqual(store.take("s1"), pendingAt(0));
  assert.equal(store.take("s1"), null);
  assert.equal(store.take("unknown"), null);
});

test("entries past the retention are dropped on the next put", () => {
  let now = 0;
  const store = createMemoryPendingAuthStore(() => now, 1000);
  store.put("old", pendingAt(0));
  now = 1001;
  store.put("new", pendingAt(now));
  assert.equal(store.take("old"), null);
  assert.deepEqual(store.take("new"), pendingAt(1001));
});

test("the oldest Connect makes room when the cap is reached", () => {
  const store = createMemoryPendingAuthStore(() => 0, 1000, 2);
  store.put("a", pendingAt(0));
  store.put("b", pendingAt(0));
  store.put("c", pendingAt(0));
  assert.equal(store.take("a"), null);
  assert.ok(store.take("b"));
  assert.ok(store.take("c"));
});
