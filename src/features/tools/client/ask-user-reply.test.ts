import assert from "node:assert/strict";
import test from "node:test";
import { parseToolTurnFields } from "../server/parse-tool-turn.ts";
import { askCallOf, replyDecisions } from "./paused-turn.ts";
import { parseToolEvent, type ApprovalPause } from "./tool-stream-events.ts";

const digest = (char: string) => char.repeat(64);
const ask = { question: "Tea?", options: ["Yes", "No"], allowFreeText: false };
const turnId = "0123456789abcdef0123456789abcdef0123";

const pause: ApprovalPause = {
  turnId,
  expiresAt: 1,
  calls: [
    {
      callId: "n1",
      name: "memory_add_note",
      preview: "",
      argsDigest: digest("a"),
      allowAlways: true,
    },
    {
      callId: "q1",
      name: "ask_user",
      preview: "",
      argsDigest: digest("b"),
      allowAlways: true,
      ask,
    },
  ],
};

test("the card answers the ask_user call of the pause", () => {
  assert.equal(askCallOf(pause)?.callId, "q1");
  assert.equal(askCallOf({ ...pause, calls: [pause.calls[0]] }), null);
});

test("an answer goes back on its call; every other call is denied", () => {
  const answer = { kind: "option", index: 0 } as const;
  assert.deepEqual(replyDecisions(pause, { callId: "q1", answer }), [
    { callId: "n1", decision: "deny", argsDigest: digest("a") },
    { callId: "q1", decision: "once", argsDigest: digest("b"), answer },
  ]);
});

test("a skip denies every call of the pause", () => {
  assert.deepEqual(
    replyDecisions(pause, "deny").map((item) => item.decision),
    ["deny", "deny"],
  );
});

test("an ask_user pause keeps a valid question and drops a bad one", () => {
  const raw = (question: unknown) => ({
    type: "approval_required",
    turnId,
    expiresAt: 1,
    calls: [
      {
        callId: "q1",
        name: "ask_user",
        preview: "",
        argsDigest: digest("b"),
        ask: question,
      },
    ],
  });
  const parsed = parseToolEvent(raw(ask));
  assert.deepEqual(
    parsed?.type === "approval_required" && parsed.calls[0].ask,
    ask,
  );
  assert.equal(
    parseToolEvent(raw({ question: "Tea?", options: ["Yes"] })),
    null,
  );
  assert.equal(parseToolEvent(raw(undefined)), null);
});

test("a resume decision may carry a well-formed answer only", () => {
  const body = (answer: unknown) => ({
    botId: "bot_1",
    resume: {
      turnId,
      decisions: [
        { callId: "q1", decision: "once", argsDigest: digest("b"), answer },
      ],
    },
  });
  const ok = parseToolTurnFields(body({ kind: "option", index: 1 }));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.ok && ok.fields.resume?.decisions[0].answer, {
    kind: "option",
    index: 1,
  });
  assert.equal(
    parseToolTurnFields(body({ kind: "option", index: 9 })).ok,
    false,
  );
  assert.equal(parseToolTurnFields(body("Yes")).ok, false);
});
