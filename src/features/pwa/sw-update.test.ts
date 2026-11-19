import assert from "node:assert/strict";
import test from "node:test";
import { createReloadGuard, updateIsWaiting } from "./sw-update.ts";

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
