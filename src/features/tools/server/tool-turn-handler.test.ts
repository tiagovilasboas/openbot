import assert from "node:assert/strict";
import test from "node:test";
import { handlePutBots } from "../../bots/server/bots-handler.ts";
import { DEFAULT_BOT } from "../../bots/bot-types.ts";
import { TOOL_BUDGET } from "../tool-budget.ts";
import { listRecentAudit } from "./audit-repository.ts";
import { forgetBotTools } from "./forget-bot-tools.ts";
import { grantTool, listGrants } from "./grants-repository.ts";
import {
  createPendingTurn,
  loadPendingTurn,
} from "./pending-turns-repository.ts";
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
import { streamResponse } from "../../../shared/testing/stream-fixtures.ts";

const lookupCall = (id: string) =>
  streamResponse(toolCallSse([{ id, name: "lookup", args: { q: id } }]));

test("gate off: the route answers as the plain stream, with no tools", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider(() => textReply("plain"));
    const { registry } = fakeTools();
    const options = turnOptions(db, fetchImpl, { env: {}, tools: registry });
    const result = await runTurn(turnRequest(), options);
    assert.deepEqual(types(result.events), ["start", "delta", "done"]);
    assert.equal(bodies[0].tools, undefined);
    const resume = await runTurn(
      turnRequest({
        resume: {
          turnId: "00000000-0000-0000-0000-000000000000",
          decisions: [
            { callId: "c", decision: "once", argsDigest: "0".repeat(64) },
          ],
        },
      }),
      options,
    );
    assert.equal(resume.status, 404);
    assert.deepEqual(resume.json, { error: "tools_disabled" });
  });
});

test("no opt-in or a crew turn also stays plain", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider(() => textReply());
    const options = turnOptions(db, fetchImpl, { tools: fakeTools().registry });
    await runTurn(turnRequest({ toolsEnabled: false }), options);
    await runTurn(turnRequest({ crew: true }), options);
    assert.ok(bodies.every((body) => body.tools === undefined));
  });
});

test("an auto tool runs, its result is wrapped, and the turn is audited", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider((_body, index) =>
      index === 0 ? lookupCall("c1") : textReply("found it"),
    );
    const { registry, lookup } = fakeTools();
    const result = await runTurn(
      turnRequest(),
      turnOptions(db, fetchImpl, { tools: registry }),
    );
    assert.deepEqual(types(result.events), [
      "start",
      "tool_call",
      "tool_result",
      "delta",
      "done",
    ]);
    assert.deepEqual(lookup.runs, [{ q: "c1" }]);
    assert.deepEqual(
      bodies[0].tools?.map((tool) => tool.function.name),
      ["lookup", "note"],
    );
    const toolMessage = bodies[1].messages.find((m) => m.role === "tool");
    assert.match(String(toolMessage?.content), /^<external-data>/);
    assert.match(String(bodies[1].messages[0].content), /external-data/);
    const audit = listRecentAudit(db);
    assert.equal(audit.length, 1);
    assert.equal(audit[0].decision, "auto");
    assert.equal(audit[0].outcome, "ok");
  });
});

test("caps: three tool steps at most, the last step gets no tools", async () => {
  await withDb(async (db) => {
    let n = 0;
    const { fetchImpl, bodies } = scriptedProvider((body) =>
      body.tools ? lookupCall(`c${(n += 1)}`) : textReply("enough"),
    );
    const { registry, lookup } = fakeTools();
    const result = await runTurn(
      turnRequest(),
      turnOptions(db, fetchImpl, { tools: registry }),
    );
    assert.equal(bodies.length, TOOL_BUDGET.maxSteps);
    assert.equal(bodies.at(-1)?.tools, undefined);
    assert.equal(lookup.runs.length, TOOL_BUDGET.maxSteps - 1);
    assert.equal(result.events.at(-1)?.type, "done");
  });
});

test("capability none: plain chat with a tools_unavailable notice", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider(() => textReply());
    const result = await runTurn(
      turnRequest(),
      turnOptions(db, fetchImpl, {
        tools: fakeTools().registry,
        capabilityOf: async () => "none",
      }),
    );
    assert.equal(result.events[0].type, "tools_unavailable");
    assert.equal(result.events.at(-1)?.type, "done");
    assert.equal(bodies[0].tools, undefined);
  });
});

test("a 4xx on a request with tools is retried once without them", async () => {
  await withDb(async (db) => {
    const { fetchImpl, bodies } = scriptedProvider((body) =>
      body.tools
        ? Response.json({ error: { message: "tools" } }, { status: 400 })
        : textReply("plain answer"),
    );
    const result = await runTurn(
      turnRequest(),
      turnOptions(db, fetchImpl, { tools: fakeTools().registry }),
    );
    const kinds = types(result.events);
    assert.equal(
      kinds.filter((kind) => kind === "tools_unavailable").length,
      1,
    );
    assert.equal(kinds.at(-1), "done");
    assert.equal(bodies.at(-1)?.tools, undefined);
    assert.ok(bodies.some((body) => body.tools));
  });
});

test("a new message expires the bot's pending turn", async () => {
  await withDb(async (db) => {
    const pending = createPendingTurn(db, {
      botId: "bot_a",
      transcript: "[]",
      pendingCalls: "[]",
      requestDigest: "d",
      stepsUsed: 1,
      callsUsed: 1,
    });
    assert.ok(pending.ok);
    const { fetchImpl } = scriptedProvider(() => textReply());
    await runTurn(
      turnRequest(),
      turnOptions(db, fetchImpl, { tools: fakeTools().registry }),
    );
    assert.equal(loadPendingTurn(db, "bot_a"), null);
  });
});

test("deleting a bot removes its grants and pending turn", async () => {
  await withDb(async (db) => {
    const bot = (id: string) => ({ ...DEFAULT_BOT, id, name: id, skills: [] });
    const put = (ids: string[]) =>
      handlePutBots(
        new Request("http://localhost/api/bots", {
          method: "PUT",
          body: JSON.stringify({ bots: ids.map(bot) }),
        }),
        db,
        (removed) => forgetBotTools(db, removed),
      );
    assert.equal((await put(["bot_a", "bot_b"])).status, 200);
    grantTool(db, "bot_a", "note");
    grantTool(db, "bot_b", "note");
    createPendingTurn(db, {
      botId: "bot_b",
      transcript: "[]",
      pendingCalls: "[]",
      requestDigest: "d",
      stepsUsed: 1,
      callsUsed: 1,
    });
    assert.equal((await put(["bot_a"])).status, 200);
    assert.equal(listGrants(db, "bot_b").length, 0);
    assert.equal(loadPendingTurn(db, "bot_b"), null);
    assert.equal(listGrants(db, "bot_a").length, 1);
  });
});
