import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import {
  handleDeleteChannel,
  handleListChannels,
  handleSaveChannel,
} from "./channels-handler.ts";
import { withChannelDb } from "./channel-test-db.ts";

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

test("channels are saved, listed and deleted", () =>
  withChannelDb(async (db) => {
    assert.equal(
      (await handleSaveChannel(put(channel), db, botIds)).status,
      200,
    );
    const listed = await handleListChannels(db).json();
    assert.deepEqual(listed.channels, [channel]);
    const del = new Request(`${base}?id=c1`, { method: "DELETE" });
    assert.equal(handleDeleteChannel(del, db).status, 200);
    assert.equal(handleDeleteChannel(del, db).status, 404);
  }));

test("a bad or oversized channel is refused", () =>
  withChannelDb(async (db) => {
    const bad = await handleSaveChannel(
      put({ ...channel, leaderBotId: "security" }),
      db,
      botIds,
    );
    assert.equal(bad.status, 400);
    assert.deepEqual(await bad.json(), { error: "leader_not_member" });
    const unknown = await handleSaveChannel(
      put({ ...channel, memberBotIds: ["engineering", "ghost"] }),
      db,
      botIds,
    );
    assert.equal(unknown.status, 404);
    const huge = await handleSaveChannel(
      put({ ...channel, instructions: "x".repeat(20_000) }),
      db,
      botIds,
    );
    assert.equal(huge.status, 413);
  }));
