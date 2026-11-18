import assert from "node:assert/strict";
import test from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { MessageData } from "./ChatMessageItem.tsx";

const { prepareRetry } = await import("./prepare-retry.ts");
const { rememberAttachments } =
  await import("../attachments/attachment-stash.ts");

const user = (id: number, extra: Partial<MessageData> = {}): MessageData => ({
  id,
  role: "user",
  language: "en",
  text: `question ${id}`,
  ...extra,
});
const bot = (id: number): MessageData => ({
  id,
  role: "assistant",
  language: "en",
  text: `answer ${id}`,
});

function persistSpy() {
  const writes: MessageData[][] = [];
  return { writes, persist: (m: MessageData[]) => writes.push(m) };
}

test("a message that is not in the thread gives nothing and stores nothing", () => {
  const { writes, persist } = persistSpy();
  assert.equal(prepareRetry([user(1), bot(2)], 99, "b", persist), undefined);
  assert.equal(writes.length, 0);
});

test("an id that belongs to an assistant message is not retried", () => {
  const { writes, persist } = persistSpy();
  assert.equal(prepareRetry([user(1), bot(2)], 2, "b", persist), undefined);
  assert.equal(writes.length, 0);
});

test("a message without a reply is returned and the thread is left alone", () => {
  const { writes, persist } = persistSpy();
  const retry = prepareRetry([user(1)], 1, "b", persist);
  assert.deepEqual(retry, { text: "question 1", id: 1, attachments: [] });
  assert.equal(writes.length, 0);
});

test("a partial reply is dropped from the stored thread before the retry", () => {
  const { writes, persist } = persistSpy();
  const thread = [user(1), bot(2), bot(3), user(4), bot(5)];
  const retry = prepareRetry(thread, 1, "b", persist);
  assert.equal(retry?.id, 1);
  assert.equal(writes.length, 1);
  assert.deepEqual(
    writes[0]?.map((m) => m.id),
    [1, 4, 5],
  );
});

test("the replies of other messages are never dropped", () => {
  const { writes, persist } = persistSpy();
  prepareRetry([user(1), bot(2), user(3)], 3, "b", persist);
  assert.equal(writes.length, 0);
});

test("files still in memory come back with the retry", () => {
  const files = [{ name: "a.txt", text: "hello" }];
  rememberAttachments("bot-files", 1, files);
  const msg = user(1, { attachments: [{ name: "a.txt", size: 5 }] });
  const retry = prepareRetry([msg], 1, "bot-files", () => {});
  assert.deepEqual(retry?.attachments, files);
});

test("a message with files whose text is gone retries without them", () => {
  const msg = user(7, { attachments: [{ name: "gone.txt", size: 5 }] });
  const retry = prepareRetry([msg], 7, "bot-after-reload", () => {});
  assert.deepEqual(retry?.attachments, []);
});

test("a message without files ignores what is stashed for the same id", () => {
  rememberAttachments("bot-nofiles", 1, [{ name: "x.txt", text: "x" }]);
  const retry = prepareRetry([user(1)], 1, "bot-nofiles", () => {});
  assert.deepEqual(retry?.attachments, []);
});

test("a storage failure while dropping the partial reply reaches the caller", () => {
  const boom = () => {
    throw new Error("disk full");
  };
  assert.throws(
    () => prepareRetry([user(1), bot(2)], 1, "b", boom),
    /disk full/,
  );
});
