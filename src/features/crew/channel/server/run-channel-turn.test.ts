import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import { MAX_DELEGATIONS_PER_TURN } from "../../run-crew-turn.ts";
import { CHANNEL_ASSIGNMENT_LIMIT } from "../channel-limits.ts";
import type { CrewChannel } from "../crew-channel.ts";
import { fakeModel } from "./channel-test-db.ts";
import { runChannelTurn } from "./run-channel-turn.ts";

const bots = [...CREW_PRESETS];
const channel: CrewChannel = {
  id: "c1",
  name: "Launch",
  memberBotIds: ["engineering", "publishing", "security"],
  leaderBotId: "engineering",
  instructions: "Keep answers short.",
};

const turn = (
  text: string,
  askModel: ReturnType<typeof fakeModel>["askModel"],
) =>
  runChannelTurn({
    channel,
    bots,
    history: [],
    text,
    language: "en",
    askModel,
  });

test("one request never starts more assignments than AU-01 allows", () => {
  assert.ok(MAX_DELEGATIONS_PER_TURN <= CHANNEL_ASSIGNMENT_LIMIT);
});

test("a plain leader reply is the only reply", async () => {
  const model = fakeModel(() => "All good.");
  const result = await turn("status?", model.askModel);
  assert.deepEqual(result, {
    ok: true,
    replies: [
      { author: { kind: "leader", botId: "engineering" }, text: "All good." },
    ],
  });
  const prompt = model.calls[0]!.systemPrompt;
  assert.match(prompt, /Keep answers short\./);
  assert.match(prompt, /Publishing/);
  assert.doesNotMatch(prompt, /Finance/, "non-members stay off the roster");
});

test("an @mention runs the member without the leader's first call", async () => {
  let n = 0;
  const model = fakeModel((call) =>
    call.speaker ? `draft ${++n}` : "Here is the summary.",
  );
  const result = await turn("@Publishing write the post", model.askModel);
  assert.ok(result.ok);
  const kinds = result.replies.map((r) => r.author.kind);
  assert.deepEqual(kinds, ["leader", "specialist", "leader"]);
  assert.equal(result.replies[1]!.text, "draft 1");
  assert.equal(result.replies[2]!.text, "Here is the summary.");
  assert.equal(model.calls.length, 2);
});

test("a mention of a non-member is not routed", async () => {
  const model = fakeModel(() => "Only I am here.");
  const result = await turn("@Finance check the budget", model.askModel);
  assert.ok(result.ok);
  assert.deepEqual(
    result.replies.map((r) => r.author.kind),
    ["leader"],
  );
});

test("a failed leader call still answers in the channel", async () => {
  const model = fakeModel(() => null);
  const result = await turn("hello", model.askModel);
  assert.ok(result.ok);
  assert.equal(result.replies.length, 1);
  assert.match(result.replies[0]!.text, /couldn't answer/);
});

test("a channel whose leader is gone refuses the turn", async () => {
  const model = fakeModel(() => "x");
  const result = await runChannelTurn({
    channel: { ...channel, leaderBotId: "ghost", memberBotIds: ["ghost"] },
    bots,
    history: [],
    text: "hi",
    language: "en",
    askModel: model.askModel,
  });
  assert.deepEqual(result, { ok: false, error: "leader_missing" });
  assert.equal(model.calls.length, 0);
});
