import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { cancelledPartialReply } from "./cancelled-partial-reply.ts";
import { createLiveBoard, liveMessages, type LiveEntry } from "./live-board.ts";
import { dropRepliesTo, userMessageBefore } from "./retry-partial-reply.ts";

const engineering = CREW_PRESETS.find(
  (b) => b.id === "engineering",
) as BotProfile;

test("the board shows settled replies plus the one streaming", () => {
  const seen: LiveEntry[][] = [];
  const board = createLiveBoard((entries) =>
    seen.push(entries.map((e) => ({ ...e }))),
  );
  board.settle("kickoff");
  const show = board.stream(engineering);
  show("par");
  show("partial");
  board.keep();
  const last = board.stream();
  last("final");
  assert.deepEqual(seen.at(-2), [
    { text: "kickoff", delegatedBot: undefined },
    { text: "partial", delegatedBot: engineering },
  ]);
  assert.equal(seen.at(-1)?.at(-1)?.text, "final");
  assert.equal(seen.at(-1)?.length, 3);
});

test("a dropped reply disappears and its late text is ignored", () => {
  const seen: LiveEntry[][] = [];
  const board = createLiveBoard((entries) =>
    seen.push(entries.map((e) => ({ ...e }))),
  );
  const show = board.stream(engineering);
  show("half");
  board.drop();
  show("late");
  assert.deepEqual(seen.at(-1), []);
});

test("live messages skip empty text and never reuse stored ids", () => {
  const messages = liveMessages(
    [{ text: "  " }, { text: "hi", delegatedBot: engineering }],
    "en",
  );
  assert.equal(messages.length, 1);
  assert.ok((messages[0]?.id ?? 0) < 0);
  assert.equal(messages[0]?.delegatedBot, engineering);
});

test("a cancel keeps the arrived text, marked cancelled", () => {
  assert.equal(cancelledPartialReply([{ text: "" }]), null);
  assert.deepEqual(cancelledPartialReply([{ text: "so far" }]), {
    text: "so far",
    delegatedBot: undefined,
    incomplete: "cancelled",
  });
});

test("a cancel in a delegated turn keeps the kickoff and finished specialists", () => {
  const reply = cancelledPartialReply([
    { text: "Delegando" },
    { text: "done one", delegatedBot: engineering },
    { text: "writing", delegatedBot: engineering },
  ]);
  assert.equal(reply?.text, "writing");
  assert.equal(reply?.incomplete, "cancelled");
  assert.equal(reply?.crew?.kickoff, "Delegando");
  assert.deepEqual(reply?.crew?.specialists, [
    { bot: engineering, text: "done one" },
  ]);
});

const thread = [
  { id: 1, role: "user" as const, language: "en" as const, text: "q1" },
  { id: 2, role: "assistant" as const, language: "en" as const, text: "a1" },
  { id: 3, role: "assistant" as const, language: "en" as const, text: "a1b" },
  { id: 4, role: "user" as const, language: "en" as const, text: "q2" },
];

test("a retry drops only the replies of its own user message", () => {
  assert.deepEqual(
    dropRepliesTo(thread, 1).map((m) => m.id),
    [1, 4],
  );
  assert.equal(dropRepliesTo(thread, 4), thread);
  assert.equal(dropRepliesTo(thread, 99), thread);
});

test("a reply finds the user message it answers", () => {
  assert.equal(userMessageBefore(thread, 2)?.id, 1);
  assert.equal(userMessageBefore(thread, 0), undefined);
});
