import assert from "node:assert/strict";
import test from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { Attachment } from "../attachments/read-attachment.ts";
import type { MessageData } from "./ChatMessageItem.tsx";

const { storeUserMessage } = await import("./store-user-message.ts");
const { recallAttachments } =
  await import("../attachments/attachment-stash.ts");

const file = (name: string, truncated = false): Attachment => ({
  name,
  text: `text of ${name}`,
  truncated,
  chars: 12,
  size: 99,
});
const earlier: MessageData = {
  id: 1,
  role: "assistant",
  language: "en",
  text: "hi",
};

function store(files: Attachment[], botId = "b-store") {
  const writes: MessageData[][] = [];
  const payloads = storeUserMessage({
    botId,
    id: 2,
    clientId: "c-1",
    language: "pt",
    text: "olá",
    files,
    thread: [earlier],
    persistMessages: (m) => writes.push(m),
  });
  return { writes, payloads };
}

test("the message goes at the end of the thread with its client id and language", () => {
  const { writes, payloads } = store([]);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], [
    earlier,
    { id: 2, role: "user", clientId: "c-1", language: "pt", text: "olá" },
  ]);
  assert.deepEqual(payloads, []);
});

test("without files the stored message has no attachments key", () => {
  const { writes } = store([]);
  assert.equal("attachments" in (writes[0]?.[1] as object), false);
});

test("files are stored as name and size only, never their text", () => {
  const { writes } = store([file("a.txt"), file("b.txt", true)]);
  const stored = writes[0]?.[1];
  assert.deepEqual(stored?.attachments, [
    { name: "a.txt", size: 99 },
    { name: "b.txt", size: 99, truncated: true },
  ]);
  assert.equal(JSON.stringify(stored).includes("text of"), false);
});

test("the request carries the raw name and text of each file", () => {
  const { payloads } = store([file("a.txt")]);
  assert.deepEqual(payloads, [{ name: "a.txt", text: "text of a.txt" }]);
});

test("the files stay in memory for a retry of this message", () => {
  store([file("a.txt")], "b-retry");
  assert.deepEqual(recallAttachments("b-retry", 2), [
    { name: "a.txt", text: "text of a.txt" },
  ]);
});

test("a message without files clears the files an older send left under its id", () => {
  store([file("old.txt")], "b-clear");
  store([], "b-clear");
  assert.deepEqual(recallAttachments("b-clear", 2), []);
});

test("the thread passed in is not changed", () => {
  const thread = [earlier];
  storeUserMessage({
    botId: "b",
    id: 2,
    clientId: "c",
    language: "en",
    text: "x",
    files: [],
    thread,
    persistMessages: () => {},
  });
  assert.deepEqual(thread, [earlier]);
});

test("a storage failure reaches the caller", () => {
  assert.throws(
    () =>
      storeUserMessage({
        botId: "b",
        id: 2,
        clientId: "c",
        language: "en",
        text: "x",
        files: [],
        thread: [],
        persistMessages: () => {
          throw new Error("quota");
        },
      }),
    /quota/,
  );
});
