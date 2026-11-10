import assert from "node:assert/strict";
import test from "node:test";

import { raceCancel } from "./cancel-turn.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import { createMessageQueue } from "./message-queue.ts";
import { insertReplyAfter } from "./thread-sequencing.ts";

test("work that finishes first wins the race", async () => {
  const controller = new AbortController();
  assert.equal(await raceCancel(controller.signal, Promise.resolve(7)), 7);
});

test("aborting resolves at once, even if the work never settles", async () => {
  const controller = new AbortController();
  const pending = raceCancel(controller.signal, new Promise<number>(() => {}));
  controller.abort();
  assert.equal(await pending, "cancelled");
});

test("an already-aborted signal is cancelled without waiting", async () => {
  const controller = new AbortController();
  controller.abort();
  assert.equal(
    await raceCancel(controller.signal, new Promise<number>(() => {})),
    "cancelled",
  );
});

test("work that fails before the cancel still rejects", async () => {
  const controller = new AbortController();
  await assert.rejects(
    raceCancel(controller.signal, Promise.reject(new Error("boom"))),
    /boom/,
  );
});

test("cancelling keeps the user's message and the queue continues", async () => {
  const user = (id: number, text: string): MessageData => ({
    id,
    role: "user",
    language: "en",
    text,
  });
  const note: MessageData = {
    id: 3,
    role: "assistant",
    language: "en",
    text: "Reply cancelled.",
  };
  const queue = createMessageQueue();
  // First message is in flight; the second was sent meanwhile and is queued.
  let thread = [user(1, "first"), user(2, "second")];
  queue.enqueue({ id: 2, text: "second", conversationId: 0 });

  const controller = new AbortController();
  const turn = raceCancel(controller.signal, new Promise<never>(() => {}));
  controller.abort();
  assert.equal(await turn, "cancelled");

  thread = insertReplyAfter(thread, 1, [note]);
  assert.deepEqual(
    thread.map((m) => m.id),
    [1, 3, 2],
    "the user's message stays, the note follows it, the queued one waits",
  );
  assert.equal(queue.dequeue()?.id, 2, "the queue moves on to the next");
});
