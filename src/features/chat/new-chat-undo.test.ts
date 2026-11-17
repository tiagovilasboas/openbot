import assert from "node:assert/strict";
import test from "node:test";
import {
  NEW_CHAT_UNDO_WINDOW_MS,
  holdClearedThread,
  restorableMessages,
  stillHeld,
} from "./new-chat-undo.ts";
import { getNewChatUndoCopy } from "./new-chat-undo-copy.ts";
import type { MessageData } from "./ChatMessageItem.tsx";

const thread = [
  { id: 1, role: "user", content: "hi" },
  { id: 2, role: "assistant", content: "hello" },
] as unknown as MessageData[];

test("the undo window is a few seconds", () => {
  assert.equal(NEW_CHAT_UNDO_WINDOW_MS, 8_000);
});

test("an empty thread has nothing to undo", () => {
  assert.equal(holdClearedThread("bot", []), null);
});

test("a cleared thread is restorable for the same bot while empty", () => {
  const held = holdClearedThread("bot", thread);
  assert.deepEqual(restorableMessages(held, "bot", []), thread);
});

test("switching bot closes the window", () => {
  const held = holdClearedThread("bot", thread);
  assert.equal(restorableMessages(held, "other", []), null);
});

test("a new message closes the window so restoring never drops it", () => {
  const held = holdClearedThread("bot", thread);
  assert.equal(restorableMessages(held, "bot", [thread[0]]), null);
});

test("nothing held restores nothing", () => {
  assert.equal(restorableMessages(null, "bot", []), null);
});

test("a held thread is dropped for good once the thread gets a message", () => {
  const held = holdClearedThread("bot", thread);
  const afterSend = stillHeld(held, "bot", [thread[0]]);
  assert.equal(afterSend, null);
  // Rolling that message back empties the thread; nothing is held any more.
  assert.equal(stillHeld(afterSend, "bot", []), null);
});

test("a held thread is dropped for good once the bot changes", () => {
  const held = holdClearedThread("bot", thread);
  const afterSwitch = stillHeld(held, "other", []);
  assert.equal(afterSwitch, null);
  assert.equal(stillHeld(afterSwitch, "bot", []), null);
});

test("a held thread stays while the same bot has an empty thread", () => {
  const held = holdClearedThread("bot", thread);
  assert.equal(stillHeld(held, "bot", []), held);
});

test("every language has the notice copy", () => {
  for (const language of ["pt", "en", "es"] as const) {
    const copy = getNewChatUndoCopy(language);
    assert.ok(copy.cleared && copy.undo);
  }
});
