import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import {
  handleListMessages,
  handlePostMessage,
} from "./channel-messages-handler.ts";
import { claimTurn } from "./channel-messages-repository.ts";
import { handleSaveChannel } from "./channels-handler.ts";
import { fakeModel, withChannelDb } from "./channel-test-db.ts";

const base = "http://localhost/api/crew/channels";
const botIds = () => CREW_PRESETS.map((b) => b.id);
const channel = {
  id: "c1",
  name: "Launch",
  memberBotIds: ["engineering", "publishing"],
  leaderBotId: "engineering",
  instructions: "",
};

const put = (body: unknown) =>
  new Request(base, { method: "PUT", body: JSON.stringify(body) });
const post = (body: unknown) =>
  new Request(`${base}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });

test("a post stores the person's message and the crew's replies in order", () =>
  withChannelDb(async (db) => {
    await handleSaveChannel(put(channel), db, botIds);
    const model = fakeModel((call) =>
      call.speaker ? "the draft" : "Summary for you.",
    );
    const deps = {
      bots: () => [...CREW_PRESETS],
      language: () => "en" as const,
      askModel: model.askModel,
      now: () => 1_000,
    };
    const response = await handlePostMessage(
      post({ channelId: "c1", text: "@Publishing draft it" }),
      db,
      deps,
    );
    assert.equal(response.status, 200);
    const listed = await handleListMessages(
      new Request(`${base}/messages?channelId=c1`),
      db,
    ).json();
    assert.deepEqual(
      listed.messages.map((m: { seq: number; author: { kind: string } }) => [
        m.seq,
        m.author.kind,
      ]),
      [
        [1, "human"],
        [2, "leader"],
        [3, "specialist"],
        [4, "leader"],
      ],
    );
    await handlePostMessage(
      post({ channelId: "c1", text: "thanks" }),
      db,
      deps,
    );
    const after = await handleListMessages(
      new Request(`${base}/messages?channelId=c1`),
      db,
    ).json();
    assert.equal(after.messages.at(-1).seq, 6);
    assert.equal(
      model.calls.at(-1)!.messages.length,
      4,
      "the leader reads back the person's and its own earlier messages",
    );
  }));

test("a channel running two turns refuses a third", () =>
  withChannelDb(async (db) => {
    await handleSaveChannel(put(channel), db, botIds);
    const now = Date.now();
    assert.notEqual(claimTurn(db, "c1", now), null);
    assert.notEqual(claimTurn(db, "c1", now), null);
    const model = fakeModel(() => "x");
    const response = await handlePostMessage(
      post({ channelId: "c1", text: "hi" }),
      db,
      {
        bots: () => [...CREW_PRESETS],
        language: () => "en",
        askModel: model.askModel,
        now: () => now,
      },
    );
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "channel_busy" });
    assert.equal(model.calls.length, 0);
    // A turn left running by a crash stops counting after a while.
    assert.notEqual(claimTurn(db, "c1", now + 60 * 60 * 1000), null);
  }));

test("posts to unknown channels or with bad text are refused", () =>
  withChannelDb(async (db) => {
    const deps = {
      bots: () => [...CREW_PRESETS],
      language: () => "en" as const,
      askModel: fakeModel(() => "x").askModel,
    };
    const missing = await handlePostMessage(
      post({ channelId: "nope", text: "hi" }),
      db,
      deps,
    );
    assert.equal(missing.status, 404);
    await handleSaveChannel(put(channel), db, botIds);
    const empty = await handlePostMessage(
      post({ channelId: "c1", text: "  " }),
      db,
      deps,
    );
    assert.equal(empty.status, 400);
    const badId = handleListMessages(
      new Request(`${base}/messages?channelId=a%20b`),
      db,
    );
    assert.equal(badId.status, 400);
  }));
