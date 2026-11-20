import assert from "node:assert/strict";
import test from "node:test";
import { sideQuestionMessages } from "./side-question.ts";

const thread = [
  { role: "assistant" as const, text: "Hi" },
  { role: "user" as const, text: "Plan the launch" },
  { role: "assistant" as const, text: "Step 1, step 2" },
  { role: "user" as const, text: "  " },
];

test("an empty question asks nothing", () => {
  assert.equal(sideQuestionMessages(thread, "   "), null);
});

test("recent messages come first, then the question, starting with the user", () => {
  assert.deepEqual(sideQuestionMessages(thread, " What is step 2? "), [
    { role: "user", text: "Plan the launch" },
    { role: "assistant", text: "Step 1, step 2" },
    { role: "user", text: "What is step 2?" },
  ]);
});

test("only the newest messages are sent", () => {
  const long = Array.from({ length: 30 }, (_, i) => ({
    role: (i % 2 ? "assistant" : "user") as "user" | "assistant",
    text: `m${i}`,
  }));
  const messages = sideQuestionMessages(long, "q", 4);
  assert.deepEqual(
    messages?.map((m) => m.text),
    ["m26", "m27", "m28", "m29", "q"],
  );
});

test("the thread passed in is never changed", () => {
  const copy = structuredClone(thread);
  sideQuestionMessages(thread, "q");
  assert.deepEqual(thread, copy);
});
