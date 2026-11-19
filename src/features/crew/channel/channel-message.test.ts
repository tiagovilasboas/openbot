import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkChannelPost,
  inChannelOrder,
  MAX_CHANNEL_POST_LENGTH,
  nextSequence,
  parseChannelAuthor,
  type ChannelMessage,
} from "./channel-message.ts";

test("the sequence starts at 1 and grows by one", () => {
  assert.equal(nextSequence(null), 1);
  assert.equal(nextSequence(0), 1);
  assert.equal(nextSequence(41), 42);
  assert.equal(nextSequence(Number.NaN), 1);
});

test("messages come back in sequence order", () => {
  const message = (seq: number): ChannelMessage => ({
    channelId: "c1",
    seq,
    author: { kind: "human" },
    text: String(seq),
    createdAt: 0,
  });
  const ordered = inChannelOrder([message(3), message(1), message(2)]);
  assert.deepEqual(
    ordered.map((m) => m.seq),
    [1, 2, 3],
  );
});

test("a post is trimmed and capped", () => {
  assert.equal(checkChannelPost("  hi "), "hi");
  assert.equal(checkChannelPost("   "), null);
  assert.equal(checkChannelPost(42), null);
  assert.equal(checkChannelPost("x".repeat(MAX_CHANNEL_POST_LENGTH + 1)), null);
});

test("stored authors are read back or dropped", () => {
  assert.deepEqual(parseChannelAuthor({ kind: "human" }), { kind: "human" });
  assert.deepEqual(parseChannelAuthor({ kind: "leader", botId: "b" }), {
    kind: "leader",
    botId: "b",
  });
  assert.equal(parseChannelAuthor({ kind: "specialist", botId: "b" }), null);
  assert.equal(parseChannelAuthor({ kind: "robot" }), null);
  assert.equal(parseChannelAuthor("human"), null);
});
