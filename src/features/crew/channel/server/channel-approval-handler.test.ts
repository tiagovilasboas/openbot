import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import { handleResolveApproval } from "./channel-approval-handler.ts";
import {
  handleListMessages,
  handlePostMessage,
  handleStopChannel,
} from "./channel-messages-handler.ts";
import { runningTurn } from "./channel-messages-repository.ts";
import { handleSaveChannel } from "./channels-handler.ts";
import { withChannelDb, type ModelCall } from "./channel-test-db.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";

const base = "http://localhost/api/crew/channels";
const group = {
  id: "c1",
  name: "Launch",
  memberBotIds: ["engineering", "publishing", "security"],
  leaderBotId: "engineering",
  instructions: "",
};
const TURN = "0f8e6c2a-1b2c-4d5e-8f90-123456789abc";
const DIGEST = "a".repeat(64);
const PAUSE = {
  turnId: TURN,
  expiresAt: Date.now() + 15 * 60_000,
  calls: [
    {
      callId: "c1",
      name: "memory_add_note",
      preview: "likes tea",
      argsDigest: DIGEST,
      allowAlways: true,
    },
  ],
};

const json = (path: string, body: unknown) =>
  new Request(`${base}/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
const decide = (decision: string, turnId = TURN) =>
  json("approval", {
    channelId: "c1",
    turnId,
    decisions: [{ callId: "c1", decision, argsDigest: DIGEST }],
  });

/** Security pauses on its first call; every other speaker answers at once. */
function room() {
  const calls: ModelCall[] = [];
  const work: Promise<void>[] = [];
  const askModel: AskCrewModel = async (call) => {
    calls.push(call);
    if (call.speaker?.id === "security" && !call.resume) {
      return { ok: false, pause: PAUSE };
    }
    return { ok: true, text: `${call.speaker?.name} done` };
  };
  return {
    calls,
    settle: () => Promise.all(work),
    deps: {
      bots: () => [...CREW_PRESETS],
      language: () => "en" as const,
      askModel,
      schedule: (p: Promise<void>) => void work.push(p),
    },
  };
}

type Db = Parameters<typeof handleListMessages>[1];
const snapshot = async (db: Db, query = "") =>
  (await handleListMessages(
    new Request(`${base}/messages?channelId=c1${query}`),
    db,
  ).json()) as {
    messages: { text: string }[];
    turn: unknown;
    approval: { botId: string; calls: { name: string }[] } | null;
  };

async function pausedGroup(db: Db, run: ReturnType<typeof room>) {
  await handleSaveChannel(
    new Request(base, { method: "PUT", body: JSON.stringify(group) }),
    db,
    () => CREW_PRESETS.map((b) => b.id),
  );
  await handlePostMessage(
    json("messages", { channelId: "c1", text: "@Security @Publishing go" }),
    db,
    run.deps,
  );
  await run.settle();
}

test("a member's tool call that needs approval pauses the turn and shows a card", () =>
  withChannelDb(async (db) => {
    const run = room();
    await pausedGroup(db, run);
    const view = await snapshot(db);
    assert.deepEqual(
      view.messages.map((m) => m.text),
      ["@Security @Publishing go"],
    );
    assert.equal(view.approval?.botId, "security");
    assert.equal(view.approval?.calls[0]?.name, "memory_add_note");
    // The turn stays live (Stop works) and Publishing waits its turn.
    assert.notEqual(runningTurn(db, "c1", Date.now()), null);
    assert.deepEqual(
      run.calls.map((c) => c.speaker?.id),
      ["security"],
    );
    assert.equal((await snapshot(db, "&parentSeq=1")).approval, null);
  }));

test("approve resumes the paused member and the rest of the turn continues", () =>
  withChannelDb(async (db) => {
    const run = room();
    await pausedGroup(db, run);
    const response = await handleResolveApproval(decide("once"), db, run.deps);
    assert.equal(response.status, 202);
    await run.settle();
    const resumed = run.calls[1]!;
    assert.equal(resumed.speaker?.id, "security");
    assert.equal(resumed.resume?.turnId, TURN);
    assert.equal(resumed.resume?.decisions[0]?.decision, "once");
    const view = await snapshot(db);
    assert.deepEqual(
      view.messages.map((m) => m.text),
      ["@Security @Publishing go", "Security done", "Publishing done"],
    );
    assert.equal(view.approval, null);
    assert.equal(view.turn, null);
    // The answered approval cannot be used twice.
    const again = await handleResolveApproval(decide("once"), db, run.deps);
    assert.equal(again.status, 410);
  }));

test("deny is passed to the member, which still answers; the group goes on", () =>
  withChannelDb(async (db) => {
    const run = room();
    await pausedGroup(db, run);
    await handleResolveApproval(decide("deny"), db, run.deps);
    await run.settle();
    assert.equal(run.calls[1]!.resume?.decisions[0]?.decision, "deny");
    assert.equal((await snapshot(db)).messages.length, 3);
  }));

test("Stop cancels a pending approval", () =>
  withChannelDb(async (db) => {
    const run = room();
    await pausedGroup(db, run);
    const stopped = await handleStopChannel(
      json("stop", { channelId: "c1" }),
      db,
    );
    assert.deepEqual(await stopped.json(), { stopped: 1 });
    assert.equal((await snapshot(db)).approval, null);
    assert.equal(runningTurn(db, "c1", Date.now()), null);
    const late = await handleResolveApproval(decide("once"), db, run.deps);
    assert.equal(late.status, 410);
    assert.equal(run.calls.length, 1);
  }));

test("a new post cancels a pending approval, so it never holds the channel", () =>
  withChannelDb(async (db) => {
    const run = room();
    await pausedGroup(db, run);
    const next = await handlePostMessage(
      json("messages", { channelId: "c1", text: "@Publishing hello" }),
      db,
      run.deps,
    );
    assert.equal(next.status, 202);
    await run.settle();
    const view = await snapshot(db);
    assert.equal(view.approval, null);
    assert.equal(view.messages.at(-1)?.text, "Publishing done");
    const late = await handleResolveApproval(decide("once"), db, run.deps);
    assert.equal(late.status, 410);
  }));

test("a malformed or foreign decision is refused", () =>
  withChannelDb(async (db) => {
    const run = room();
    await pausedGroup(db, run);
    const bad = await handleResolveApproval(
      json("approval", { channelId: "c1", turnId: TURN, decisions: [] }),
      db,
      run.deps,
    );
    assert.equal(bad.status, 400);
    const other = await handleResolveApproval(
      decide("once", "1f8e6c2a-1b2c-4d5e-8f90-123456789abc"),
      db,
      run.deps,
    );
    assert.equal(other.status, 410);
    assert.notEqual((await snapshot(db)).approval, null);
  }));
