import assert from "node:assert/strict";
import { test } from "node:test";
import {
  appendMessage,
  claimTurn,
  finishTurn,
  listMessages,
  STALE_TURN_MS,
} from "./channel-messages-repository.ts";
import { deleteChannel, saveChannel } from "./channels-repository.ts";
import { withChannelDb } from "./channel-test-db.ts";

const channel = {
  id: "c1",
  name: "Launch",
  memberBotIds: ["a", "b"],
  leaderBotId: "a",
  instructions: "",
};

test("messages get a stable sequence per channel", () =>
  withChannelDb((db) => {
    saveChannel(db, channel, 1);
    saveChannel(db, { ...channel, id: "c2" }, 1);
    appendMessage(db, "c1", { kind: "human" }, "one", 1);
    appendMessage(db, "c2", { kind: "human" }, "other", 1);
    const two = appendMessage(
      db,
      "c1",
      { kind: "leader", botId: "a" },
      "two",
      2,
    );
    assert.equal(two.seq, 2);
    assert.deepEqual(
      listMessages(db, "c1").map((m) => [m.seq, m.text]),
      [
        [1, "one"],
        [2, "two"],
      ],
    );
    assert.deepEqual(
      listMessages(db, "c1", 1).map((m) => m.text),
      ["two"],
      "a page keeps the latest messages",
    );
  }));

test("deleting a channel drops its messages", () =>
  withChannelDb((db) => {
    saveChannel(db, channel, 1);
    appendMessage(db, "c1", { kind: "human" }, "one", 1);
    assert.equal(deleteChannel(db, "c1"), true);
    assert.deepEqual(listMessages(db, "c1"), []);
  }));

test("a channel runs at most two turns; finished or stale ones free a slot", () =>
  withChannelDb((db) => {
    saveChannel(db, channel, 1);
    const first = claimTurn(db, "c1", 1_000);
    assert.notEqual(first, null);
    assert.notEqual(claimTurn(db, "c1", 1_000), null);
    assert.equal(claimTurn(db, "c1", 1_000), null);
    finishTurn(db, first!, "completed", 2_000);
    assert.notEqual(claimTurn(db, "c1", 2_000), null);
    assert.notEqual(claimTurn(db, "c1", 2_000 + STALE_TURN_MS), null);
  }));
