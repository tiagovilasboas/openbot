import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import type { ChannelAuthor, ChannelMessage } from "../channel-message.ts";
import { buildChannelTimeline } from "./channel-timeline.ts";

const bots = [...CREW_PRESETS];
const message = (seq: number, author: ChannelAuthor, text = `m${seq}`) =>
  ({ channelId: "c1", seq, author, text, createdAt: 0 }) as ChannelMessage;
const leader: ChannelAuthor = { kind: "leader", botId: "engineering" };
const specialist = (botId: string, ok = true): ChannelAuthor => ({
  kind: "specialist",
  botId,
  task: "draft it",
  ok,
});

test("a plain exchange shows every message in sequence order", () => {
  const timeline = buildChannelTimeline(
    [message(2, leader), message(1, { kind: "human" })],
    bots,
  );
  assert.deepEqual(
    timeline.map((e) => [e.seq, e.fromPerson, e.bot?.id ?? null]),
    [
      [1, true, null],
      [2, false, "engineering"],
    ],
  );
  assert.equal(timeline[1]!.room, undefined);
});

test("a delegated turn folds its specialists into the room", () => {
  const timeline = buildChannelTimeline(
    [
      message(1, { kind: "human" }),
      message(2, leader, "kickoff"),
      message(3, specialist("publishing")),
      message(4, specialist("security", false)),
      message(5, leader, "final"),
    ],
    bots,
  );
  assert.deepEqual(
    timeline.map((e) => e.seq),
    [1, 2, 5],
  );
  const room = timeline[2]!.room!;
  assert.equal(room.kickoff, "kickoff");
  assert.equal(room.synthesis.text, "final");
  assert.deepEqual(
    room.steps.map((s) => [s.bot.id, s.status, s.task]),
    [
      ["publishing", "done", "draft it"],
      ["security", "failed", "draft it"],
    ],
  );
});

test("an answer from a deleted bot stays in the timeline", () => {
  const timeline = buildChannelTimeline(
    [
      message(1, { kind: "human" }),
      message(2, leader),
      message(3, specialist("ghost")),
      message(4, leader),
    ],
    bots,
  );
  assert.deepEqual(
    timeline.map((e) => [e.seq, e.bot?.id ?? null]),
    [
      [1, null],
      [2, "engineering"],
      [3, null],
      [4, "engineering"],
    ],
  );
});

test("group answers stay in line, and a reply points at its message", () => {
  const timeline = buildChannelTimeline(
    [
      message(1, { kind: "human" }),
      message(2, { kind: "member", botId: "security", ok: true }, "risky"),
      message(3, { kind: "member", botId: "publishing", ok: false }),
      message(4, { kind: "human", replyToSeq: 2 }, "why?"),
    ],
    bots,
  );
  assert.deepEqual(
    timeline.map((e) => [e.seq, e.bot?.id ?? null, e.failed ?? false]),
    [
      [1, null, false],
      [2, "security", false],
      [3, "publishing", true],
      [4, null, false],
    ],
  );
  assert.deepEqual(
    [timeline[3]!.replyTo?.seq, timeline[3]!.replyTo?.bot?.id],
    [2, "security"],
  );
});

test("a message with thread replies carries the count for its marker", () => {
  const timeline = buildChannelTimeline(
    [message(1, { kind: "human" }), message(2, leader)],
    bots,
    { 2: 3 },
  );
  assert.equal(timeline[0]!.replyCount, undefined);
  assert.equal(timeline[1]!.replyCount, 3);
});
