import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import {
  buildCrewRoomView,
  crewRoomsBySynthesisId,
  type CrewRoomMessage,
} from "./crew-room-view.ts";
import { MAX_DELEGATIONS_PER_TURN } from "./run-crew-turn.ts";

const preset = (id: string) =>
  CREW_PRESETS.find((bot) => bot.id === id) as BotProfile;
const engineering = preset("engineering");
const security = preset("security");
const product = preset("publishing");

const user = (id: number, text = "ask"): CrewRoomMessage => ({
  id,
  role: "user",
  text,
});
const reply = (
  id: number,
  text: string,
  extra: Partial<CrewRoomMessage> = {},
): CrewRoomMessage => ({ id, role: "assistant", text, ...extra });

const delegatedTurn: CrewRoomMessage[] = [
  user(1),
  reply(2, "Delegating to Engineering, Security."),
  reply(3, "eng answer", {
    delegatedBot: engineering,
    crewStep: { task: "check CI", ok: true, durationMs: 1200 },
  }),
  reply(4, "Security could not answer this time.", {
    delegatedBot: security,
    crewStep: { task: "audit auth", ok: false, durationMs: 300 },
  }),
  reply(5, "final answer"),
];

test("a delegated turn becomes an ordered room: kickoff, steps, synthesis", () => {
  const room = buildCrewRoomView(delegatedTurn);
  assert.ok(room);
  assert.equal(room.kickoff, "Delegating to Engineering, Security.");
  assert.deepEqual(
    room.steps.map((s) => [s.id, s.bot.id, s.task, s.durationMs]),
    [
      [3, "engineering", "check CI", 1200],
      [4, "security", "audit auth", 300],
    ],
  );
  assert.deepEqual(room.synthesis, { id: 5, text: "final answer" });
});

test("a failed step keeps its place and says it failed", () => {
  const room = buildCrewRoomView(delegatedTurn);
  assert.deepEqual(
    room?.steps.map((s) => s.status),
    ["done", "failed"],
  );
  assert.equal(room?.steps[1]?.text, "Security could not answer this time.");
});

test("when every specialist fails the room still shows the failed steps", () => {
  const room = buildCrewRoomView([
    user(1),
    reply(2, "Delegating to Engineering."),
    reply(3, "Engineering could not answer this time.", {
      delegatedBot: engineering,
      crewStep: { task: "t", ok: false, durationMs: 50 },
    }),
    reply(4, "I could not combine the answers right now."),
  ]);
  assert.deepEqual(
    room?.steps.map((s) => s.status),
    ["failed"],
  );
});

test("a turn with no delegation has no room", () => {
  assert.equal(buildCrewRoomView([user(1), reply(2, "plain")]), null);
  assert.equal(buildCrewRoomView([]), null);
});

test("an @mentioned bot's single reply is not a team room", () => {
  const room = buildCrewRoomView([
    user(1),
    reply(2, "from the mentioned bot", { delegatedBot: engineering }),
  ]);
  assert.equal(room, null);
});

test("replies in the middle without a bot are not steps", () => {
  assert.equal(
    buildCrewRoomView([user(1), reply(2, "a"), reply(3, "b"), reply(4, "c")]),
    null,
  );
});

test("a delegated turn shows at most three steps", () => {
  const bots = [engineering, security, product, engineering, security];
  const turn = [
    user(1),
    reply(2, "kickoff"),
    ...bots.map((bot, i) => reply(3 + i, `answer ${i}`, { delegatedBot: bot })),
    reply(8, "final"),
  ];
  const room = buildCrewRoomView(turn);
  assert.equal(room?.steps.length, MAX_DELEGATIONS_PER_TURN);
  assert.deepEqual(
    room?.steps.map((s) => s.id),
    [3, 4, 5],
  );
  assert.equal(room?.synthesis.id, 8);
});

test("replies from older versions have no task, status or duration", () => {
  const room = buildCrewRoomView([
    user(1),
    reply(2, "Delegating to Engineering."),
    reply(3, "eng answer", { delegatedBot: engineering }),
    reply(4, "final"),
  ]);
  assert.deepEqual(room?.steps[0], {
    id: 3,
    bot: engineering,
    task: null,
    status: "done",
    text: "eng answer",
    durationMs: null,
  });
});

test("a step saved without a duration keeps its task and status", () => {
  const room = buildCrewRoomView([
    user(1),
    reply(2, "k"),
    reply(3, "x", {
      delegatedBot: security,
      crewStep: { task: "audit", ok: false },
    }),
    reply(4, "f"),
  ]);
  assert.equal(room?.steps[0]?.task, "audit");
  assert.equal(room?.steps[0]?.status, "failed");
  assert.equal(room?.steps[0]?.durationMs, null);
});

test("a thread yields one room per delegated turn, keyed by its synthesis", () => {
  const rooms = crewRoomsBySynthesisId([
    ...delegatedTurn,
    user(6),
    reply(7, "plain answer"),
    user(8),
    reply(9, "kickoff 2"),
    reply(10, "pm answer", { delegatedBot: product }),
    reply(11, "final 2"),
  ]);
  assert.deepEqual([...rooms.keys()], [5, 11]);
  assert.equal(rooms.get(11)?.steps[0]?.bot.id, "publishing");
  assert.equal(rooms.get(7), undefined);
});

test("a step that was cut off reads as incomplete, not failed", () => {
  const room = buildCrewRoomView([
    user(1),
    reply(2, "Delegating to Engineering."),
    reply(3, "CI is gre", {
      delegatedBot: engineering,
      crewStep: { task: "check CI", ok: true, incomplete: "error" },
    }),
    reply(4, "final answer"),
  ]);
  assert.equal(room?.steps[0]?.status, "incomplete");
});
