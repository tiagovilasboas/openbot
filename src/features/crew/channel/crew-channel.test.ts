import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkCrewChannel,
  MAX_CHANNEL_INSTRUCTIONS_LENGTH,
  MAX_CHANNEL_MEMBERS,
} from "./crew-channel.ts";

const valid = {
  id: "c1",
  name: "  Launch room ",
  memberBotIds: ["chief", "writer", "writer"],
  leaderBotId: "chief",
  instructions: " Ship the launch post. ",
};

test("a valid channel is trimmed and its members deduplicated", () => {
  assert.deepEqual(checkCrewChannel(valid), {
    ok: true,
    channel: {
      id: "c1",
      name: "Launch room",
      memberBotIds: ["chief", "writer"],
      leaderBotId: "chief",
      instructions: "Ship the launch post.",
    },
  });
});

test("instructions may be left out", () => {
  const check = checkCrewChannel({ ...valid, instructions: undefined });
  assert.equal(check.ok && check.channel.instructions, "");
});

test("the leader must be a member", () => {
  assert.deepEqual(checkCrewChannel({ ...valid, leaderBotId: "outsider" }), {
    ok: false,
    problem: "leader_not_member",
  });
});

test("a channel holds at most eight members", () => {
  const eight = Array.from({ length: MAX_CHANNEL_MEMBERS }, (_, i) =>
    i === 0 ? "chief" : `bot-${i}`,
  );
  assert.equal(checkCrewChannel({ ...valid, memberBotIds: eight }).ok, true);
  assert.deepEqual(
    checkCrewChannel({ ...valid, memberBotIds: [...eight, "bot-9"] }),
    { ok: false, problem: "too_many_members" },
  );
});

test("instructions over the cap are refused", () => {
  const long = "x".repeat(MAX_CHANNEL_INSTRUCTIONS_LENGTH + 1);
  assert.deepEqual(checkCrewChannel({ ...valid, instructions: long }), {
    ok: false,
    problem: "invalid_instructions",
  });
});

test("bad shapes name their problem", () => {
  assert.equal(checkCrewChannel(null).ok, false);
  assert.deepEqual(checkCrewChannel([]), {
    ok: false,
    problem: "invalid_body",
  });
  assert.deepEqual(checkCrewChannel({ ...valid, id: "a b" }), {
    ok: false,
    problem: "invalid_id",
  });
  assert.deepEqual(checkCrewChannel({ ...valid, name: "   " }), {
    ok: false,
    problem: "invalid_name",
  });
  assert.deepEqual(checkCrewChannel({ ...valid, memberBotIds: [] }), {
    ok: false,
    problem: "invalid_members",
  });
  assert.deepEqual(checkCrewChannel({ ...valid, memberBotIds: ["../x"] }), {
    ok: false,
    problem: "invalid_members",
  });
});
