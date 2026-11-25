import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";
import { handleResolveApproval } from "./channel-approval-handler.ts";
import {
  handleListMessages,
  handlePostMessage,
  handleStopChannel,
} from "./channel-messages-handler.ts";
import { withChannelDb, type ModelCall } from "./channel-test-db.ts";
import { handleSaveChannel } from "./channels-handler.ts";

const base = "http://localhost/api/crew/channels";
const group = {
  id: "c1",
  name: "Launch",
  memberBotIds: ["engineering", "publishing", "security"],
  leaderBotId: "engineering",
  instructions: "",
};
const TURN = "0f8e6c2a-1b2c-4d5e-8f90-123456789abc";
const DIGEST = "b".repeat(64);
const QUESTION = {
  question: "Which?",
  options: ["A", "B"],
  allowFreeText: false,
};
const PAUSE = {
  turnId: TURN,
  expiresAt: Date.now() + 15 * 60_000,
  calls: [
    {
      callId: "q1",
      name: "ask_user",
      preview: "",
      argsDigest: DIGEST,
      allowAlways: true,
      ask: QUESTION,
    },
  ],
};

const json = (path: string, body: unknown) =>
  new Request(`${base}/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
const answer = (reply: unknown, turnId = TURN) =>
  json("approval", {
    channelId: "c1",
    turnId,
    decisions: [
      { callId: "q1", decision: "once", argsDigest: DIGEST, answer: reply },
    ],
  });

/** Security asks a question first; every other speaker answers at once. */
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

async function askedGroup(db: Db, run: ReturnType<typeof room>) {
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

const approvalOf = async (db: Db) =>
  (
    (await handleListMessages(
      new Request(`${base}/messages?channelId=c1`),
      db,
    ).json()) as { approval: { calls: { ask?: unknown }[] } | null }
  ).approval;

test("a member's question shows in the room and its answer resumes that member", () =>
  withChannelDb(async (db) => {
    const run = room();
    await askedGroup(db, run);
    assert.deepEqual((await approvalOf(db))?.calls[0]?.ask, QUESTION);
    const response = await handleResolveApproval(
      answer({ kind: "option", index: 1 }),
      db,
      run.deps,
    );
    assert.equal(response.status, 202);
    await run.settle();
    const resumed = run.calls[1]!;
    assert.equal(resumed.speaker?.id, "security");
    assert.equal(resumed.resume?.turnId, TURN);
    assert.deepEqual(resumed.resume?.decisions[0]?.answer, {
      kind: "option",
      index: 1,
    });
    assert.equal(run.calls.at(-1)?.speaker?.id, "publishing");
    assert.equal(await approvalOf(db), null);
  }));

test("a second answer to the same question is refused", () =>
  withChannelDb(async (db) => {
    const run = room();
    await askedGroup(db, run);
    await handleResolveApproval(
      answer({ kind: "option", index: 0 }),
      db,
      run.deps,
    );
    await run.settle();
    const again = await handleResolveApproval(
      answer({ kind: "option", index: 0 }),
      db,
      run.deps,
    );
    assert.equal(again.status, 410);
    assert.equal(run.calls.filter((c) => c.resume).length, 1);
  }));

test("an answer for another turn or with a malformed shape never resumes", () =>
  withChannelDb(async (db) => {
    const run = room();
    await askedGroup(db, run);
    const foreign = await handleResolveApproval(
      answer(
        { kind: "option", index: 0 },
        "1f8e6c2a-1b2c-4d5e-8f90-123456789abc",
      ),
      db,
      run.deps,
    );
    assert.equal(foreign.status, 410);
    const bad = await handleResolveApproval(
      answer({ kind: "option", index: "0" }),
      db,
      run.deps,
    );
    assert.equal(bad.status, 400);
    assert.notEqual(await approvalOf(db), null);
    assert.equal(run.calls.filter((c) => c.resume).length, 0);
  }));

test("Stop cancels a pending question", () =>
  withChannelDb(async (db) => {
    const run = room();
    await askedGroup(db, run);
    await handleStopChannel(json("stop", { channelId: "c1" }), db);
    assert.equal(await approvalOf(db), null);
    const late = await handleResolveApproval(
      answer({ kind: "option", index: 0 }),
      db,
      run.deps,
    );
    assert.equal(late.status, 410);
    assert.equal(run.calls.filter((c) => c.resume).length, 0);
  }));

test("a new post cancels a pending question", () =>
  withChannelDb(async (db) => {
    const run = room();
    await askedGroup(db, run);
    await handlePostMessage(
      json("messages", { channelId: "c1", text: "@Publishing never mind" }),
      db,
      run.deps,
    );
    await run.settle();
    const late = await handleResolveApproval(
      answer({ kind: "option", index: 0 }),
      db,
      run.deps,
    );
    assert.equal(late.status, 410);
    assert.equal(run.calls.filter((c) => c.resume).length, 0);
  }));
