import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "./ChatMessageItem.tsx";
import { branchBlock, branchThread, branchTitle } from "./branch-thread.ts";

const user = (id: number): MessageData => ({
  id,
  language: "en",
  role: "user",
  text: `u${id}`,
  clientId: `client-id-${id}`,
});
const bot = (id: number, extra: Partial<MessageData> = {}): MessageData => ({
  id,
  language: "en",
  role: "assistant",
  text: `a${id}`,
  ...extra,
});

test("copies up to and including the chosen reply", () => {
  const thread = [user(10), bot(11), user(12), bot(13)];
  const result = branchThread(thread, 11);
  assert.deepEqual(
    result?.messages.map((m) => m.text),
    ["u10", "a11"],
  );
});

test("gives the copies fresh sequential ids and drops send ids", () => {
  const result = branchThread([user(10), bot(11), user(12)], 11);
  assert.deepEqual(
    result?.messages.map((m) => m.id),
    [1, 2],
  );
  assert.ok(result?.messages.every((m) => m.clientId === undefined));
});

test("leaves the original untouched and the copy independent", () => {
  const thread = [user(10), bot(11, { toolSteps: [] })];
  const snapshot = structuredClone(thread);
  const result = branchThread(thread, 11);
  result!.messages[1].text = "changed";
  assert.deepEqual(thread, snapshot);
});

test("refuses unknown ids, user messages, failed and partial replies", () => {
  const thread = [
    user(1),
    bot(2, { failure: {} as unknown as MessageData["failure"] }),
    bot(3, { incomplete: "cancelled" as MessageData["incomplete"] }),
  ];
  for (const id of [99, 1, 2, 3]) assert.equal(branchThread(thread, id), null);
});

test("refuses while a turn is running", () => {
  const thread = [user(1), bot(2)];
  assert.equal(branchBlock(thread[1], true), "running");
  assert.equal(branchThread(thread, 2, true), null);
  assert.equal(branchBlock(thread[1], false), null);
});

test("titles the branch from the original in the user's language", () => {
  assert.equal(branchTitle("Plano", "pt"), "Plano (ramo)");
  assert.equal(branchTitle(" Plan ", "en"), "Plan (branch)");
  assert.equal(branchTitle("", "es"), "(rama)");
});
