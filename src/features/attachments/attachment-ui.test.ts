import { LANGUAGES } from "../language/language.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { createMessageQueue } from "../chat/message-queue.ts";
import { attachmentCopy, describeNotice } from "./attachment-copy.ts";
import { rememberAttachments, recallAttachments } from "./attachment-stash.ts";
import {
  formatFileSize,
  toPayloads,
  toSummaries,
} from "./attachment-summary.ts";
import type { Attachment } from "./read-attachment.ts";

const file: Attachment = {
  name: "notes.txt",
  text: "secret file text",
  truncated: true,
  chars: 16,
  size: 4300,
};

test("the stored summary keeps the name and size, never the text", () => {
  const [summary] = toSummaries([file]);
  assert.deepEqual(summary, { name: "notes.txt", size: 4300, truncated: true });
  assert.ok(!JSON.stringify(summary).includes("secret"));
  assert.deepEqual(toSummaries([{ ...file, truncated: false }]), [
    { name: "notes.txt", size: 4300 },
  ]);
});

test("the request payload is just name and text", () => {
  assert.deepEqual(toPayloads([file]), [
    { name: "notes.txt", text: "secret file text" },
  ]);
});

test("sizes read like a person would say them", () => {
  assert.equal(formatFileSize(812, "en"), "812 B");
  assert.equal(formatFileSize(4300, "en"), "4.2 KB");
  assert.equal(formatFileSize(4300, "pt"), "4,2 KB");
  assert.equal(formatFileSize(150 * 1024, "en"), "150 KB");
});

test("every refusal has human copy in both languages", () => {
  for (const language of LANGUAGES) {
    for (const reason of [
      "too_large",
      "not_text",
      "unreadable",
      "too_many",
      "empty",
    ] as const) {
      const [line] = describeNotice(
        { kind: "rejected", files: [{ name: "x.bin", reason }] },
        language,
      );
      assert.ok(line.startsWith("x.bin: "), line);
      assert.ok(!line.includes("_"), `raw code in: ${line}`);
    }
    assert.ok(describeNotice({ kind: "too_big" }, language)[0].length > 20);
  }
});

test("pt and en copy have the same keys", () => {
  assert.deepEqual(
    Object.keys(attachmentCopy.pt).sort(),
    Object.keys(attachmentCopy.en).sort(),
  );
});

test("the stash gives a message its files back, and forgets on empty", () => {
  const files = toPayloads([file]);
  rememberAttachments("bot-a", 7, files);
  assert.deepEqual(recallAttachments("bot-a", 7), files);
  assert.deepEqual(recallAttachments("bot-b", 7), []);
  rememberAttachments("bot-a", 7, []);
  assert.deepEqual(recallAttachments("bot-a", 7), []);
});

test("a queued message keeps its files while it waits", () => {
  const queue = createMessageQueue();
  const files = toPayloads([file]);
  queue.enqueue({ id: 1, text: "one", conversationId: 0, attachments: files });
  queue.enqueue({ id: 2, text: "two", conversationId: 0 });
  assert.deepEqual(queue.dequeue()?.attachments, files);
  assert.equal(queue.dequeue()?.attachments, undefined);
});
