import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { mentionDelegationReply, routeByMentions } from "./mention-routing.ts";
import { parseDelegations } from "./parse-delegations.ts";

const bots = [...CREW_PRESETS];
const chief = CREW_PRESETS[0] as BotProfile;
const ids = (text: string) =>
  routeByMentions(text, bots, chief.id).map((r) => r.bot.id);

test("mentions route in mention order, case-insensitively", () => {
  assert.deepEqual(ids("@security and @ENGINEERING please review"), [
    "security",
    "engineering",
  ]);
});

test("unknown names, the chief and repeats are ignored", () => {
  assert.deepEqual(ids("@nobody @ChiefofStaff @Product @product hi"), [
    "product",
  ]);
});

test("no valid mention means no route; emails are not mentions", () => {
  assert.deepEqual(ids("write to me@example.com"), []);
  assert.equal(mentionDelegationReply("plain text", bots, chief.id), null);
});

test("the task is the message without the mentions, on one line", () => {
  const [route] = routeByMentions(
    "@Engineering\nreview   PR 7",
    bots,
    chief.id,
  );
  assert.equal(route?.task, "review PR 7");
});

test("a mention-only message hands the whole text over", () => {
  const [route] = routeByMentions("@Engineering", bots, chief.id);
  assert.equal(route?.task, "@Engineering");
});

test("the synthetic reply parses back into the same delegations", () => {
  const reply = mentionDelegationReply(
    "@Security @Product plan it",
    bots,
    chief.id,
  );
  assert.ok(reply);
  const parsed = parseDelegations(reply, bots, chief.id);
  assert.deepEqual(
    parsed.delegations.map((d) => [d.bot.id, d.task]),
    [
      ["security", "plan it"],
      ["product", "plan it"],
    ],
  );
});
