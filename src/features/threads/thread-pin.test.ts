import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_THREAD_ID,
  newThread,
  setThreadPinned,
  storableThreads,
  withDefaultThread,
} from "./thread-model.ts";

const a = newThread("bot", "a", 1);
const b = newThread("bot", "b", 2);
const c = newThread("bot", "c", 3);

test("a pinned thread comes right after the default, before older ones", () => {
  const pinned = setThreadPinned([a, b, c], "c", true);
  const stored = JSON.parse(JSON.stringify(storableThreads(pinned)));
  const ids = withDefaultThread("bot", stored).map((t) => t.id);
  assert.deepEqual(ids, [DEFAULT_THREAD_ID, "c", "a", "b"]);
});

test("unpinning drops the flag and restores creation order", () => {
  const pinned = setThreadPinned([a, b, c], "c", true);
  const unpinned = setThreadPinned(pinned, "c", false);
  assert.equal("pinned" in unpinned[2], false);
  const ids = withDefaultThread("bot", unpinned).map((t) => t.id);
  assert.deepEqual(ids, [DEFAULT_THREAD_ID, "a", "b", "c"]);
});

test("the default thread is never pinned", () => {
  const threads = withDefaultThread("bot", [a]);
  const result = setThreadPinned(threads, DEFAULT_THREAD_ID, true);
  assert.equal(result[0].pinned, undefined);
});

test("only a literal true survives sanitizing", () => {
  const ids = withDefaultThread("bot", [{ ...a, pinned: "yes" }]);
  assert.equal(ids[1].pinned, undefined);
});
