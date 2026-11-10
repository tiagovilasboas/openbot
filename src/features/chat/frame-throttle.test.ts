import assert from "node:assert/strict";
import test from "node:test";
import { createFrameThrottle, type FrameScheduler } from "./frame-throttle.ts";

/** A scheduler the test steps by hand: one `frame()` is one animation frame. */
function manualFrames() {
  const queue = new Map<number, () => void>();
  let next = 1;
  const scheduler: FrameScheduler = {
    request(run) {
      queue.set(next, run);
      return next++;
    },
    cancel(handle) {
      queue.delete(handle as number);
    },
  };
  return {
    scheduler,
    pending: () => queue.size,
    frame() {
      const runs = [...queue.values()];
      queue.clear();
      runs.forEach((run) => run());
    },
  };
}

test("a burst of pushes paints once per frame with the newest value", () => {
  const frames = manualFrames();
  const painted: string[] = [];
  const throttle = createFrameThrottle<string>(
    (value) => painted.push(value),
    frames.scheduler,
  );
  throttle.push("a");
  throttle.push("ab");
  throttle.push("abc");
  assert.equal(frames.pending(), 1);
  assert.deepEqual(painted, []);
  frames.frame();
  assert.deepEqual(painted, ["abc"]);
  throttle.push("abcd");
  frames.frame();
  assert.deepEqual(painted, ["abc", "abcd"]);
});

test("cancel drops the pending value", () => {
  const frames = manualFrames();
  const painted: string[] = [];
  const throttle = createFrameThrottle<string>(
    (value) => painted.push(value),
    frames.scheduler,
  );
  throttle.push("late");
  throttle.cancel();
  frames.frame();
  assert.deepEqual(painted, []);
  assert.equal(frames.pending(), 0);
});
