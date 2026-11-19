import assert from "node:assert/strict";
import test from "node:test";
import {
  createReloadGuard,
  dropServiceWorkers,
  updateIsWaiting,
} from "./sw-update.ts";

test("an update is offered only with a waiting worker and a controller", () => {
  assert.equal(updateIsWaiting({ waiting: {} }, true), true);
  assert.equal(updateIsWaiting({ waiting: {} }, false), false);
  assert.equal(updateIsWaiting({ waiting: null }, true), false);
  assert.equal(updateIsWaiting(null, true), false);
});

test("the page reloads once, and only after the user asked", () => {
  const guard = createReloadGuard();
  assert.equal(guard.shouldReload(), false);
  guard.request();
  assert.equal(guard.shouldReload(), true);
  assert.equal(guard.shouldReload(), false);
});

test("dev drops every worker and only the shell caches", async () => {
  let unregistered = 0;
  const deleted: string[] = [];
  const worker = {
    unregister: async () => {
      unregistered += 1;
      return true;
    },
  };
  await dropServiceWorkers(
    { getRegistrations: async () => [worker, worker] },
    {
      keys: async () => ["openbot-shell-v3", "other-app"],
      delete: async (key) => {
        deleted.push(key);
        return true;
      },
    },
  );
  assert.equal(unregistered, 2);
  assert.deepEqual(deleted, ["openbot-shell-v3"]);
});
