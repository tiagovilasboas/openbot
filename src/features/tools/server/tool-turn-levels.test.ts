// The level stored in the database reaches the tool turn: this is the wiring
// between levels-repository and the loop, which the loop tests inject.
import assert from "node:assert/strict";
import test from "node:test";
import { streamResponse } from "../../../shared/testing/stream-fixtures.ts";
import type { ToolTurnEvent } from "../tool-turn-events.ts";
import { listRecentAudit } from "./audit-repository.ts";
import { listGrants } from "./grants-repository.ts";
import { setToolLevel } from "./levels-repository.ts";
import {
  fakeTools,
  runTurn,
  scriptedProvider,
  textReply,
  toolCallSse,
  turnOptions,
  turnRequest,
  withDb,
} from "./tool-turn-fixtures.ts";

type Approval = Extract<ToolTurnEvent, { type: "approval_required" }>;

const call = (id: string, name: string) =>
  streamResponse(toolCallSse([{ id, name, args: { q: id } }]));

test("a stored block keeps the tool off the offer and refuses its call", async () => {
  await withDb(async (db) => {
    setToolLevel(db, "lookup", "block");
    const { fetchImpl, bodies } = scriptedProvider((_body, index) =>
      index === 0 ? call("c1", "lookup") : textReply("ok"),
    );
    const { registry, lookup } = fakeTools();
    await runTurn(
      turnRequest(),
      turnOptions(db, fetchImpl, { tools: registry }),
    );
    assert.deepEqual(
      bodies[0].tools?.map((tool) => tool.function.name),
      ["note"],
    );
    assert.deepEqual(lookup.runs, []);
    const audit = listRecentAudit(db);
    assert.equal(audit[0].decision, "rejected");
    assert.equal(audit[0].outcome, "tool_blocked");
  });
});

test("a stored allow runs an ask tool that offers always-allow", async () => {
  await withDb(async (db) => {
    setToolLevel(db, "note", "allow");
    const { fetchImpl } = scriptedProvider((_body, index) =>
      index === 0 ? call("n1", "note") : textReply("noted"),
    );
    const { registry, note } = fakeTools();
    const result = await runTurn(
      turnRequest(),
      turnOptions(db, fetchImpl, { tools: registry }),
    );
    assert.equal(note.runs.length, 1);
    assert.ok(result.events.every((e) => e.type !== "approval_required"));
  });
});

test("a tool blocked during the pause is refused and gets no grant", async () => {
  await withDb(async (db) => {
    const { fetchImpl } = scriptedProvider((_body, index) =>
      index === 0 ? call("n1", "note") : textReply("noted"),
    );
    const { registry, note } = fakeTools();
    const options = turnOptions(db, fetchImpl, { tools: registry });
    const first = await runTurn(turnRequest(), options);
    const approval = first.events.at(-1) as Approval;
    assert.equal(approval.type, "approval_required");

    setToolLevel(db, "note", "block");
    await runTurn(
      turnRequest({
        resume: {
          turnId: approval.turnId,
          decisions: approval.calls.map((pending) => ({
            callId: pending.callId,
            decision: "always",
            argsDigest: pending.argsDigest,
          })),
        },
      }),
      options,
    );
    assert.deepEqual(note.runs, []);
    assert.deepEqual(listGrants(db, "bot_a"), []);
  });
});
