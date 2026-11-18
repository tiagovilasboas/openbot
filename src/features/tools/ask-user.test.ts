import assert from "node:assert/strict";
import test from "node:test";
import {
  answerAskUser,
  ASK_USER_LIMITS,
  parseAskUserPrompt,
  parseUserAnswer,
} from "./ask-user.ts";

const valid = { question: "Which one?", options: ["A", "B"] };

test("a valid prompt is trimmed to one line and free text defaults off", () => {
  assert.deepEqual(
    parseAskUserPrompt({
      question: "  Which\n one? ",
      options: [" A ", "B"],
    }),
    { question: "Which one?", options: ["A", "B"], allowFreeText: false },
  );
  assert.equal(
    parseAskUserPrompt({ ...valid, allowFreeText: true })?.allowFreeText,
    true,
  );
});

test("repeated options are dropped, ignoring case", () => {
  assert.deepEqual(
    parseAskUserPrompt({ question: "Q", options: ["Yes", "yes", "No"] })
      ?.options,
    ["Yes", "No"],
  );
});

test("too few options after dedupe, or too many, are refused", () => {
  assert.equal(parseAskUserPrompt({ question: "Q", options: ["A"] }), null);
  assert.equal(
    parseAskUserPrompt({ question: "Q", options: ["A", "a"] }),
    null,
  );
  const seven = ["1", "2", "3", "4", "5", "6", "7"];
  assert.equal(parseAskUserPrompt({ question: "Q", options: seven }), null);
  assert.ok(parseAskUserPrompt({ question: "Q", options: seven.slice(0, 6) }));
});

test("empty, long or mistyped fields and unknown keys are refused", () => {
  const long = (n: number) => "x".repeat(n + 1);
  const bad: unknown[] = [
    null,
    [],
    "text",
    { options: ["A", "B"] },
    { ...valid, question: "   " },
    { ...valid, question: long(ASK_USER_LIMITS.questionMaxChars) },
    { ...valid, options: ["A", long(ASK_USER_LIMITS.optionMaxChars)] },
    { ...valid, options: ["A", ""] },
    { ...valid, options: ["A", 2] },
    { ...valid, options: "A,B" },
    { ...valid, allowFreeText: "yes" },
    { ...valid, extra: 1 },
  ];
  for (const raw of bad) assert.equal(parseAskUserPrompt(raw), null);
});

test("answers parse by shape: an option index or trimmed text", () => {
  assert.deepEqual(parseUserAnswer({ kind: "option", index: 1 }), {
    kind: "option",
    index: 1,
  });
  assert.deepEqual(parseUserAnswer({ kind: "text", text: " ok " }), {
    kind: "text",
    text: "ok",
  });
  for (const raw of [
    null,
    { kind: "option", index: -1 },
    { kind: "option", index: 1.5 },
    { kind: "option", index: ASK_USER_LIMITS.maxOptions },
    { kind: "text", text: "  " },
    { kind: "text", text: "x".repeat(ASK_USER_LIMITS.answerMaxChars + 1) },
    { kind: "vote" },
  ]) {
    assert.equal(parseUserAnswer(raw), null);
  }
});

test("an option answer maps to its text, for the model and the thread", () => {
  const prompt = parseAskUserPrompt(valid)!;
  const result = answerAskUser(prompt, { kind: "option", index: 1 });
  assert.equal(result.ok, true);
  assert.ok(result.ok);
  assert.deepEqual(JSON.parse(result.text), {
    question: "Which one?",
    answer: "B",
    source: "option",
  });
  assert.equal(result.preview, "B");
});

test("free text counts only when the question allows it", () => {
  const closed = parseAskUserPrompt(valid)!;
  const open = parseAskUserPrompt({ ...valid, allowFreeText: true })!;
  const answer = { kind: "text", text: "Neither" };
  assert.deepEqual(answerAskUser(closed, answer), {
    ok: false,
    code: "bad_answer",
  });
  const result = answerAskUser(open, answer);
  assert.ok(result.ok);
  assert.equal(JSON.parse(result.text).source, "free_text");
});

test("an index past the options or a missing answer is a bad answer", () => {
  const prompt = parseAskUserPrompt(valid)!;
  for (const answer of [{ kind: "option", index: 2 }, undefined]) {
    assert.deepEqual(answerAskUser(prompt, answer), {
      ok: false,
      code: "bad_answer",
    });
  }
});
