import assert from "node:assert/strict";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { streamResponse } from "../../../shared/testing/stream-fixtures.ts";
import { handleDeleteGrants, handleGetGrants } from "./grants-handler.ts";
import { grantTool, listAllGrants } from "./grants-repository.ts";
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

const del = (db: DatabaseSync, body: unknown) =>
  handleDeleteGrants(
    new Request("http://localhost/api/tools/grants", {
      method: "DELETE",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    db,
  );

test("GET lists every grant with its bot, tool and time", async () => {
  await withDb(async (db) => {
    grantTool(db, "bot_b", "note", 20);
    grantTool(db, "bot_a", "note", 10);
    const body = (await handleGetGrants(db).json()) as unknown;
    assert.deepEqual(body, {
      grants: [
        { botId: "bot_a", toolName: "note", grantedAt: 10 },
        { botId: "bot_b", toolName: "note", grantedAt: 20 },
      ],
    });
  });
});

test("DELETE revokes one grant and leaves the others", async () => {
  await withDb(async (db) => {
    grantTool(db, "bot_a", "note");
    grantTool(db, "bot_b", "note");
    const response = await del(db, { botId: "bot_a", toolName: "note" });
    assert.equal(response.status, 200);
    assert.deepEqual(
      listAllGrants(db).map((grant) => grant.botId),
      ["bot_b"],
    );
  });
});

test("DELETE with all revokes every grant", async () => {
  await withDb(async (db) => {
    grantTool(db, "bot_a", "note");
    grantTool(db, "bot_b", "lookup");
    assert.equal((await del(db, { all: true })).status, 200);
    assert.equal(listAllGrants(db).length, 0);
  });
});

test("DELETE refuses a malformed body and revokes nothing", async () => {
  await withDb(async (db) => {
    grantTool(db, "bot_a", "note");
    for (const body of ["nope", "[]", { botId: "bot_a" }, { all: "yes" }]) {
      assert.equal((await del(db, body)).status, 400);
    }
    assert.equal(listAllGrants(db).length, 1);
  });
});

test("after a revoke the next call of the tool asks again", async () => {
  await withDb(async (db) => {
    const script = () =>
      scriptedProvider((_body, index) =>
        index === 0
          ? streamResponse(
              toolCallSse([{ id: "n1", name: "note", args: { text: "tea" } }]),
            )
          : textReply("noted"),
      );
    grantTool(db, "bot_a", "note");

    const tools = fakeTools();
    const granted = await runTurn(
      turnRequest(),
      turnOptions(db, script().fetchImpl, { tools: tools.registry }),
    );
    assert.equal(types(granted.events).includes("approval_required"), false);
    assert.equal(tools.note.runs.length, 1);

    await del(db, { botId: "bot_a", toolName: "note" });

    const again = fakeTools();
    const asked = await runTurn(
      turnRequest(),
      turnOptions(db, script().fetchImpl, { tools: again.registry }),
    );
    assert.equal(asked.events.at(-1)?.type, "approval_required");
    assert.equal(again.note.runs.length, 0);
  });
});
