import assert from "node:assert/strict";
import test from "node:test";
import { parseSuggestionReply } from "./parse-suggestion-reply.ts";
import {
  SUGGESTION_MAX_DESCRIPTION,
  SUGGESTION_MAX_INSTRUCTIONS,
  SUGGESTION_MAX_NAME,
} from "./suggestion-limits.ts";

const good = {
  name: "Code review",
  description: "Reviews diffs",
  instructions: "Read the diff.\nList risks first.",
};

test("a plain JSON reply becomes a draft with a derived command", () => {
  assert.deepEqual(parseSuggestionReply(JSON.stringify(good)), {
    ...good,
    command: "/code-review",
  });
});

test("one code fence around the JSON is stripped, with or without a language", () => {
  const body = JSON.stringify(good);
  for (const reply of [
    `\`\`\`json\n${body}\n\`\`\``,
    `\`\`\`\n${body}\n\`\`\``,
    `  \`\`\`JSON\r\n${body}\r\n\`\`\`  `,
  ]) {
    assert.equal(parseSuggestionReply(reply)?.name, "Code review");
  }
});

test("replies that are not usable JSON are rejected", () => {
  for (const reply of [
    "",
    "Sure! Here is a skill.",
    `Here you go: ${JSON.stringify(good)}`,
    '{"name": "x", "instructions": ',
    "[]",
    "null",
    '"a string"',
    JSON.stringify([good]),
  ]) {
    assert.equal(parseSuggestionReply(reply), null, reply);
  }
});

test("a draft needs a name and instructions", () => {
  const parse = (extra: object) =>
    parseSuggestionReply(JSON.stringify({ ...good, ...extra }));
  assert.equal(parse({ name: " " }), null);
  assert.equal(parse({ name: 4 }), null);
  assert.equal(parse({ instructions: "" }), null);
  const noDescription = parseSuggestionReply(
    JSON.stringify({ name: "A", instructions: "do" }),
  );
  assert.equal(noDescription?.description, "");
});

test("every field is cut to its cap", () => {
  const draft = parseSuggestionReply(
    JSON.stringify({
      name: "n".repeat(SUGGESTION_MAX_NAME + 40),
      description: "d".repeat(SUGGESTION_MAX_DESCRIPTION + 40),
      instructions: "i".repeat(SUGGESTION_MAX_INSTRUCTIONS + 40),
    }),
  );
  assert.equal(draft?.name.length, SUGGESTION_MAX_NAME);
  assert.equal(draft?.description.length, SUGGESTION_MAX_DESCRIPTION);
  assert.equal(draft?.instructions.length, SUGGESTION_MAX_INSTRUCTIONS);
});

test("the command comes from the sanitizer, never from the reply", () => {
  const draft = parseSuggestionReply(
    JSON.stringify({
      ...good,
      name: "Weird Name! $(rm -rf)",
      command: "/../../etc/passwd",
    }),
  );
  assert.match(draft?.command ?? "", /^\/[a-z0-9_-]+$/);
  assert.ok(!draft?.command.includes("etc"));
});

test("control characters are removed; names stay on one line", () => {
  const draft = parseSuggestionReply(
    JSON.stringify({
      name: "Line\none\u0000",
      description: "a\nb",
      instructions: "keep\nthis\u0007 line",
    }),
  );
  assert.equal(draft?.name, "Line one");
  assert.equal(draft?.description, "a b");
  assert.equal(draft?.instructions, "keep\nthis line");
});

test("accented names still give a readable command", () => {
  const draft = parseSuggestionReply(
    JSON.stringify({ ...good, name: "Revisão de código" }),
  );
  assert.equal(draft?.name, "Revisão de código");
  assert.equal(draft?.command, "/revisao-de-codigo");
});
