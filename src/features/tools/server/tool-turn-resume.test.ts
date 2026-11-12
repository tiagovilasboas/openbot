import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { streamResponse } from "../../../shared/testing/stream-fixtures.ts";
import type { ToolTurnEvent } from "../tool-turn-events.ts";
import { listRecentAudit } from "./audit-repository.ts";
import { listGrants } from "./grants-repository.ts";
import {
  loadPendingTurn,
  PENDING_TURN_TTL_MS,
} from "./pending-turns-repository.ts";
import {
  fakeTools,
  MESSAGES,
  runTurn,
  scriptedProvider,
  textReply,
  toolCallSse,
  turnOptions,
  turnRequest,
  types,
  withDb,
} from "./tool-turn-fixtures.ts";

type Approval = Extract<ToolTurnEvent, { type: "approval_required" }>;

/** Pauses on a "note" call, then answers every later step in text. */
async function pause(db: DatabaseSync, clock = { now: 1_000 }) {
  const { fetchImpl, bodies } = scriptedProvider((_body, index) =>
    index === 0
      ? streamResponse(
          toolCallSse([{ id: "n1", name: "note", args: { text: "tea" } }]),
        )
      : textReply("noted"),
  );
  const tools = fakeTools();
  const options = turnOptions(db, fetchImpl, {
    tools: tools.registry,
    now: () => clock.now,
  });
  const first = await runTurn(turnRequest(), options);
  const approval = first.events.at(-1) as Approval;
  assert.equal(approval.type, "approval_required");
  return { approval, options, tools, bodies, clock, first };
}

const decide = (
  approval: Approval,
  decision: "once" | "always" | "deny",
  extra: Record<string, unknown> = {},
) =>
  turnRequest({
    resume: {
      turnId: approval.turnId,
      decisions: approval.calls.map((call) => ({
        callId: call.callId,
        decision,
        argsDigest: call.argsDigest,
      })),
    },
    ...extra,
  });

test("approval pauses the turn without running the call", async () => {
  await withDb(async (db) => {
    const { approval, tools, first, clock } = await pause(db);
    assert.equal(tools.note.runs.length, 0);
    assert.deepEqual(types(first.events), [
      "start",
      "tool_call",
      "approval_required",
    ]);
    assert.equal(approval.calls[0].name, "note");
    assert.equal(approval.calls[0].allowAlways, true);
    assert.equal(approval.expiresAt, clock.now + PENDING_TURN_TTL_MS);
    assert.equal(loadPendingTurn(db, "bot_a", clock.now)?.id, approval.turnId);
    assert.equal(listRecentAudit(db)[0].decision, "asked");
    assert.equal(listRecentAudit(db)[0].turnId, approval.turnId);
  });
});

test("resume once runs the stored call once and closes the turn", async () => {
  await withDb(async (db) => {
    const { approval, options, tools, bodies, clock } = await pause(db);
    const resumed = await runTurn(decide(approval, "once"), options);
    assert.deepEqual(types(resumed.events), [
      "tool_result",
      "start",
      "delta",
      "done",
    ]);
    assert.deepEqual(tools.note.runs, [{ text: "tea" }]);
    const replayed = bodies[1].messages.find((m) => m.role === "tool");
    assert.match(String(replayed?.content), /fake result/);
    assert.equal(loadPendingTurn(db, "bot_a", clock.now), null);
    assert.equal(listGrants(db, "bot_a").length, 0);
    const again = await runTurn(decide(approval, "once"), options);
    assert.equal(again.status, 410);
    assert.equal(tools.note.runs.length, 1);
  });
});

test("resume always records a grant for this bot and tool", async () => {
  await withDb(async (db) => {
    const { approval, options, tools } = await pause(db);
    await runTurn(decide(approval, "always"), options);
    assert.equal(tools.note.runs.length, 1);
    assert.deepEqual(
      listGrants(db, "bot_a").map((grant) => grant.toolName),
      ["note"],
    );
    const audit = listRecentAudit(db);
    assert.equal(audit[0].decision, "always");
  });
});

test("deny never runs the call and grants nothing", async () => {
  await withDb(async (db) => {
    const { approval, options, tools, bodies } = await pause(db);
    const resumed = await runTurn(decide(approval, "deny"), options);
    assert.equal(resumed.events.at(-1)?.type, "done");
    assert.equal(tools.note.runs.length, 0);
    assert.equal(listGrants(db, "bot_a").length, 0);
    const replayed = bodies[1].messages.find((m) => m.role === "tool");
    assert.equal(replayed?.content, "error: denied_by_user");
  });
});

test("an expired turn cannot be resumed", async () => {
  await withDb(async (db) => {
    const { approval, options, tools, clock } = await pause(db);
    clock.now += PENDING_TURN_TTL_MS;
    const resumed = await runTurn(decide(approval, "once"), options);
    assert.equal(resumed.status, 410);
    assert.deepEqual(resumed.json, { error: "turn_expired" });
    assert.equal(tools.note.runs.length, 0);
  });
});

test("a resume for other messages is rejected and the turn stays", async () => {
  await withDb(async (db) => {
    const { approval, options, tools, clock } = await pause(db);
    const tampered = decide(approval, "once", {
      messages: [
        ...MESSAGES,
        { role: "assistant", text: "x" },
        { role: "user", text: "more" },
      ],
    });
    const resumed = await runTurn(tampered, options);
    assert.equal(resumed.status, 409);
    assert.deepEqual(resumed.json, { error: "digest_mismatch" });
    assert.equal(tools.note.runs.length, 0);
    assert.ok(loadPendingTurn(db, "bot_a", clock.now));
  });
});

test("a decision with forged args digest runs nothing", async () => {
  await withDb(async (db) => {
    const { approval, options, tools } = await pause(db);
    const forged = turnRequest({
      resume: {
        turnId: approval.turnId,
        decisions: [
          { callId: "n1", decision: "always", argsDigest: "a".repeat(64) },
        ],
      },
    });
    await runTurn(forged, options);
    assert.equal(tools.note.runs.length, 0);
    assert.equal(listGrants(db, "bot_a").length, 0);
  });
});
