import assert from "node:assert/strict";
import test from "node:test";
import { streamResponse } from "../../../shared/testing/stream-fixtures.ts";
import type { ToolTurnEvent } from "../tool-turn-events.ts";
import {
  fakeTools,
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
type Done = Extract<ToolTurnEvent, { type: "done" }>;

const modelOf = (body: unknown) => (body as { model?: string }).model;
const limited = () =>
  new Response(JSON.stringify({ error: "limit" }), {
    status: 429,
    headers: { "retry-after": "60" },
  });
const lookupCall = (id: string) =>
  streamResponse(toolCallSse([{ id, name: "lookup", args: { q: id } }]));
const withBackups = (extra: Record<string, unknown> = {}) =>
  turnRequest({
    modelId: "vendor/main",
    backupModelIds: ["vendor/b1", "vendor/b2"],
    ...extra,
  });
const modelsOf = (bodies: unknown[]) => bodies.map(modelOf);
const doneOf = (events: ToolTurnEvent[]) =>
  events.find((event) => event.type === "done") as Done | undefined;

test("a limited main model answers from the first backup, with the notice", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider((body) =>
      modelOf(body) === "vendor/main" ? limited() : textReply("from backup"),
    );
    const result = await runTurn(
      withBackups(),
      turnOptions(db, fetchImpl, { tools: fakeTools().registry }),
    );
    assert.deepEqual(modelsOf(bodies), ["vendor/main", "vendor/b1"]);
    assert.deepEqual(types(result.events), ["start", "delta", "done"]);
    assert.equal(doneOf(result.events)?.failover?.fromModel, "vendor/main");
    assert.equal(doneOf(result.events)?.failover?.toModel, "vendor/b1");
  });
});

test("a switch in a later step never re-runs the tool that already ran", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider((body, index) => {
      if (index === 0) return lookupCall("c1");
      return modelOf(body) === "vendor/main" ? limited() : textReply("done");
    });
    const { registry, lookup } = fakeTools();
    const result = await runTurn(
      withBackups(),
      turnOptions(db, fetchImpl, { tools: registry }),
    );
    assert.deepEqual(modelsOf(bodies), [
      "vendor/main",
      "vendor/main",
      "vendor/b1",
    ]);
    assert.deepEqual(lookup.runs, [{ q: "c1" }]);
    assert.ok(
      JSON.stringify(bodies[2]).includes("c1"),
      "the backup sees the earlier exchange",
    );
    assert.equal(doneOf(result.events)?.failover?.toModel, "vendor/b1");
  });
});

test("later steps stay on the backup and the notice survives them", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider((body, index) => {
      if (modelOf(body) === "vendor/main") return limited();
      return index === 1 ? lookupCall("c1") : textReply("done");
    });
    const { registry, lookup } = fakeTools();
    const result = await runTurn(
      withBackups(),
      turnOptions(db, fetchImpl, { tools: registry }),
    );
    assert.deepEqual(modelsOf(bodies), [
      "vendor/main",
      "vendor/b1",
      "vendor/b1",
    ]);
    assert.equal(lookup.runs.length, 1);
    assert.equal(doneOf(result.events)?.failover?.fromModel, "vendor/main");
  });
});

test("a stream cut after its first text is not retried on a backup", async () => {
  await withDb(async (db) => {
    const cut = () =>
      streamResponse([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "hel" } }] })}\n\n`,
      ]);
    const { fetchImpl, bodies } = scriptedProvider(cut);
    const { registry, lookup } = fakeTools();
    const result = await runTurn(
      withBackups(),
      turnOptions(db, fetchImpl, { tools: registry }),
    );
    assert.deepEqual(modelsOf(bodies), ["vendor/main"]);
    assert.equal(lookup.runs.length, 0);
    assert.equal(result.events.at(-1)?.type, "error");
  });
});

test("backups outside the allow-list are never asked", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider((body) =>
      modelOf(body) === "vendor/b2" ? textReply("ok") : limited(),
    );
    const result = await runTurn(
      withBackups(),
      turnOptions(db, fetchImpl, {
        tools: fakeTools().registry,
        env: {
          OPENBOT_TOOLS: "1",
          OPENBOT_ALLOWED_MODELS: "vendor/main,vendor/b2",
        },
      }),
    );
    assert.deepEqual(modelsOf(bodies), ["vendor/main", "vendor/b2"]);
    assert.equal(doneOf(result.events)?.failover?.toModel, "vendor/b2");
  });
});

test("a disallowed main model is still refused before any call", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider(() => textReply());
    const result = await runTurn(
      withBackups(),
      turnOptions(db, fetchImpl, {
        tools: fakeTools().registry,
        env: { OPENBOT_TOOLS: "1", OPENBOT_ALLOWED_MODELS: "vendor/b1" },
      }),
    );
    assert.equal(result.status, 400);
    assert.equal(bodies.length, 0);
  });
});

test("a resumed turn runs the approved call once and may use a backup", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider((body, index) => {
      if (index === 0) {
        return streamResponse(
          toolCallSse([{ id: "n1", name: "note", args: { text: "tea" } }]),
        );
      }
      return modelOf(body) === "vendor/main" ? limited() : textReply("noted");
    });
    const tools = fakeTools();
    const options = turnOptions(db, fetchImpl, { tools: tools.registry });
    const first = await runTurn(withBackups(), options);
    const approval = first.events.at(-1) as Approval;
    assert.equal(approval.type, "approval_required");
    const resumed = await runTurn(
      withBackups({
        resume: {
          turnId: approval.turnId,
          decisions: approval.calls.map((call) => ({
            callId: call.callId,
            decision: "once",
            argsDigest: call.argsDigest,
          })),
        },
      }),
      options,
    );
    assert.deepEqual(modelsOf(bodies), [
      "vendor/main",
      "vendor/main",
      "vendor/b1",
    ]);
    assert.equal(tools.note.runs.length, 1);
    assert.deepEqual(types(resumed.events), [
      "tool_result",
      "start",
      "delta",
      "done",
    ]);
    assert.equal(doneOf(resumed.events)?.failover?.toModel, "vendor/b1");
  });
});
