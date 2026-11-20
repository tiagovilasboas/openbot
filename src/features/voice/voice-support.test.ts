import assert from "node:assert/strict";
import test from "node:test";
import { finalTranscript } from "./speech-recognition.ts";
import {
  appendDictation,
  READ_ALOUD_MAX_CHARS,
  speakableText,
} from "./voice-support.ts";

test("dictation joins the draft with one space", () => {
  assert.equal(appendDictation("", " hello "), "hello");
  assert.equal(appendDictation("Plan", "the launch"), "Plan the launch");
  assert.equal(appendDictation("Plan ", "the launch"), "Plan the launch");
  assert.equal(appendDictation("Plan", "  "), "Plan");
});

test("only final results become text", () => {
  const event = {
    resultIndex: 1,
    results: [
      { isFinal: true, 0: { transcript: "old " } },
      { isFinal: true, 0: { transcript: "new words" } },
      { isFinal: false, 0: { transcript: " guess" } },
    ],
  };
  assert.equal(finalTranscript(event), "new words");
});

test("markdown marks and code are not read aloud", () => {
  const text =
    "# Title\n**Bold** and `x` [link](http://a)\n```js\ncode()\n```\nend";
  assert.equal(speakableText(text), "Title Bold and x link end");
  assert.equal(
    speakableText("a".repeat(READ_ALOUD_MAX_CHARS + 5)).length,
    READ_ALOUD_MAX_CHARS,
  );
});
