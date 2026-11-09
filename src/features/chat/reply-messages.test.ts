import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import { buildReplyMessages } from "./reply-messages.ts";

const engineering = CREW_PRESETS[1] as BotProfile;
const security = CREW_PRESETS[3] as BotProfile;

function counter() {
  let id = 10;
  return () => ++id;
}

test("a plain reply becomes one assistant message", () => {
  const messages = buildReplyMessages(
    { text: "hi" },
    { language: "en", modelBadge: "m", nextId: counter() },
  );
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.text, "hi");
  assert.equal(messages[0]?.delegatedBot, undefined);
});

test("a delegated turn shows kickoff, each specialist, then the synthesis", () => {
  const messages = buildReplyMessages(
    {
      text: "final",
      crew: {
        kickoff: "Delegating to Engineering, Security.",
        specialists: [
          { bot: engineering, text: "eng answer" },
          { bot: security, text: "sec answer" },
        ],
      },
    },
    { language: "en", nextId: counter() },
  );
  assert.deepEqual(
    messages.map((m) => [m.id, m.text, m.delegatedBot?.id]),
    [
      [11, "Delegating to Engineering, Security.", undefined],
      [12, "eng answer", "engineering"],
      [13, "sec answer", "security"],
      [14, "final", undefined],
    ],
  );
});
