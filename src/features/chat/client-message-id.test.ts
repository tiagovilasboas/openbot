import assert from "node:assert/strict";
import { test } from "node:test";
import type { MessageData } from "./ChatMessageItem.tsx";
import {
  clientIdOf,
  clientMessageIdHeaders,
  DOUBLE_SUBMIT_WINDOW_MS,
  isAlreadySent,
  isClientMessageId,
  newClientMessageId,
  sendIdFor,
} from "./client-message-id.ts";

const user = (id: number, clientId?: string): MessageData => ({
  id,
  role: "user",
  language: "en",
  text: "hi",
  ...(clientId ? { clientId } : {}),
});

test("a new id has the shape the server accepts", () => {
  assert.ok(isClientMessageId(newClientMessageId()));
  assert.notEqual(newClientMessageId(), newClientMessageId());
});

test("shape check rejects odd values", () => {
  for (const bad of ["", "short", "a b c d e f g h", "x".repeat(65), 7, null]) {
    assert.equal(isClientMessageId(bad), false);
  }
});

test("the header is set only for a valid id", () => {
  assert.deepEqual(clientMessageIdHeaders("abcdefgh-1"), {
    "idempotency-key": "abcdefgh-1",
  });
  assert.deepEqual(clientMessageIdHeaders(undefined), {});
  assert.deepEqual(clientMessageIdHeaders("bad id!"), {});
});

test("the same text inside the window keeps the id, later or other text does not", () => {
  let n = 0;
  const make = () => `id-number-${++n}`;
  const first = sendIdFor(null, "hello", 1000, make);
  const again = sendIdFor(first, "hello", 1000 + DOUBLE_SUBMIT_WINDOW_MS, make);
  assert.equal(again.id, first.id);
  assert.notEqual(
    sendIdFor(first, "hello", 1001 + DOUBLE_SUBMIT_WINDOW_MS, make).id,
    first.id,
  );
  assert.notEqual(sendIdFor(first, "other", 1001, make).id, first.id);
});

test("a thread that holds the id counts the send as done", () => {
  const thread = [user(1, "abcdefgh-1")];
  assert.equal(isAlreadySent(thread, "abcdefgh-1"), true);
  assert.equal(isAlreadySent(thread, "abcdefgh-2"), false);
  assert.equal(isAlreadySent([], "abcdefgh-1"), false);
});

test("the stored id is found by user message id", () => {
  const thread = [user(1, "abcdefgh-1"), user(2)];
  assert.equal(clientIdOf(thread, 1), "abcdefgh-1");
  assert.equal(clientIdOf(thread, 2), undefined);
  assert.equal(clientIdOf(thread, 9), undefined);
});
