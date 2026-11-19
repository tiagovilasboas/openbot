import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_CHANNEL_MEMBERS } from "../crew-channel.ts";
import {
  canAddMember,
  channelDraftProblem,
  emptyChannelDraft,
  newChannelId,
  setLeader,
  toggleMember,
} from "./channel-draft.ts";

test("a new channel is led by the main bot and needs a name", () => {
  const draft = emptyChannelDraft("chief", "c1");
  assert.deepEqual(draft.memberBotIds, ["chief"]);
  assert.equal(draft.leaderBotId, "chief");
  assert.equal(channelDraftProblem(draft), "invalid_name");
  assert.equal(channelDraftProblem({ ...draft, name: "Launch" }), null);
});

test("members are added and removed; the cap blocks a ninth", () => {
  let draft = emptyChannelDraft("chief", "c1");
  for (let i = 1; i < MAX_CHANNEL_MEMBERS; i += 1) {
    draft = toggleMember(draft, `bot-${i}`);
  }
  assert.equal(draft.memberBotIds.length, MAX_CHANNEL_MEMBERS);
  assert.equal(canAddMember(draft), false);
  assert.equal(toggleMember(draft, "extra"), draft);
  draft = toggleMember(draft, "bot-3");
  assert.equal(draft.memberBotIds.includes("bot-3"), false);
  assert.equal(canAddMember(draft), true);
});

test("removing the leader hands the lead to the first member left", () => {
  let draft = toggleMember(emptyChannelDraft("chief", "c1"), "writer");
  draft = toggleMember(draft, "chief");
  assert.equal(draft.leaderBotId, "writer");
  draft = toggleMember(draft, "writer");
  assert.equal(draft.leaderBotId, "");
  assert.equal(
    channelDraftProblem({ ...draft, name: "x" }),
    "invalid_id",
    "an empty channel cannot be saved",
  );
});

test("only a member can become the leader", () => {
  const draft = toggleMember(emptyChannelDraft("chief", "c1"), "writer");
  assert.equal(setLeader(draft, "writer").leaderBotId, "writer");
  assert.equal(setLeader(draft, "outsider").leaderBotId, "chief");
});

test("new channel ids pass the server's id check", () => {
  assert.match(newChannelId(), /^[A-Za-z0-9_-]{1,64}$/);
  assert.match(emptyChannelDraft("chief").id, /^ch_/);
});
