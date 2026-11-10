import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "./ChatMessageItem.tsx";
import { rollBackThread, rollbackBlock } from "./roll-back-thread.ts";

const user = (id: number, text = `u${id}`): MessageData => ({
  id,
  language: "en",
  role: "user",
  text,
});
const bot = (id: number, extra: Partial<MessageData> = {}): MessageData => ({
  id,
  language: "en",
  role: "assistant",
  text: `a${id}`,
  ...extra,
});

const thread = [user(1), bot(2), user(3), bot(4)];

test("rolls back to the first message: nothing is kept", () => {
  const result = rollBackThread(thread, 1);
  assert.deepEqual(result?.messages, []);
  assert.equal(result?.text, "u1");
  assert.equal(result?.discarded, 3);
});

test("rolls back to a middle message and keeps the earlier pair", () => {
  const result = rollBackThread(thread, 3);
  assert.deepEqual(
    result?.messages.map((m) => m.id),
    [1, 2],
  );
  assert.equal(result?.text, "u3");
  assert.equal(result?.discarded, 1);
});

test("rolling back the last message discards nothing else", () => {
  const result = rollBackThread([user(1), bot(2), user(3)], 3);
  assert.deepEqual(
    result?.messages.map((m) => m.id),
    [1, 2],
  );
  assert.equal(result?.discarded, 0);
});

test("an unknown id returns null", () => {
  assert.equal(rollBackThread(thread, 99), null);
  assert.equal(rollBackThread([], 1), null);
});

test("an assistant message cannot be rolled back", () => {
  assert.equal(rollBackThread(thread, 2), null);
});

test("delegation messages are cut like any other", () => {
  const specialist = {
    id: "b2",
    name: "Dev",
  } as unknown as MessageData["delegatedBot"];
  const delegated = [
    user(1),
    bot(2, { delegatedBot: specialist }),
    user(3),
    bot(4, { delegatedBot: specialist }),
  ];
  const result = rollBackThread(delegated, 3);
  assert.equal(result?.messages.length, 2);
  assert.equal(result?.messages[1].delegatedBot, specialist);
  assert.equal(result?.discarded, 1);
});

test("the input thread is not mutated", () => {
  const input = [...thread];
  rollBackThread(input, 1);
  assert.deepEqual(input, thread);
});

test("going back is blocked while a turn runs or the queue holds messages", () => {
  assert.equal(rollbackBlock(true, 0), "running");
  assert.equal(rollbackBlock(true, 2), "running");
  assert.equal(rollbackBlock(false, 1), "queued");
  assert.equal(rollbackBlock(false, 0), null);
});
