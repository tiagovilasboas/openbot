import assert from "node:assert/strict";
import test from "node:test";
import { chatCopy } from "./chat-copy.ts";
import {
  canRetryIncomplete,
  incompleteKindOf,
  incompleteNote,
} from "./incomplete-reply.ts";

test("a reply cut for length is its own kind, apart from an interrupted one", () => {
  assert.equal(incompleteKindOf({ kind: "response_too_long" }), "too_long");
  assert.equal(incompleteKindOf({ kind: "cancelled" }), "cancelled");
  assert.equal(incompleteKindOf({ kind: "server", status: 500 }), "error");
  assert.equal(incompleteKindOf({ kind: "unreachable" }), "error");
});

test("only an interrupted reply offers a retry", () => {
  assert.equal(canRetryIncomplete("error"), true);
  assert.equal(canRetryIncomplete("too_long"), false);
  assert.equal(canRetryIncomplete("cancelled"), false);
});

test("the too-long note says it was cut and that retrying will not help, in both languages", () => {
  for (const language of ["pt", "en"] as const) {
    const c = chatCopy[language];
    const note = incompleteNote("too_long", c);
    assert.equal(note, c.truncatedNote);
    assert.notEqual(note, c.interruptedNote);
    assert.notEqual(note, c.cancelledNote);
    assert.equal(incompleteNote("error", c), c.interruptedNote);
    assert.equal(incompleteNote("cancelled", c), c.cancelledNote);
  }
  assert.match(chatCopy.en.truncatedNote, /will not help/);
  assert.match(chatCopy.pt.truncatedNote, /não resolve/);
});
