import assert from "node:assert/strict";
import test from "node:test";
import type { RoutineRunner } from "../../routines/server/run-routines.ts";
import { saveRoutine } from "../../routines/server/routines-repository.ts";
import { routine, withDb } from "../../routines/server/routines-test-db.ts";
import {
  handleAutomationRun,
  handleTokenCreate,
  handleTokenRevoke,
  handleTokenStatus,
} from "./automation-handler.ts";
import { createAutomationToken } from "./automation-token-repository.ts";

const LOCAL = "127.0.0.1";
const replying: RoutineRunner = async (r) => ({
  kind: "replied",
  text: `ran:${r.botId}:${r.prompt}`,
});

function post(token: string | null, body: unknown) {
  return new Request("http://localhost/api/automation/run", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("runs a bot prompt through the injected runner", () =>
  withDb(async (db) => {
    const token = createAutomationToken(db, 1);
    const res = await handleAutomationRun(
      post(token, { botId: "bot-a", prompt: "oi" }),
      db,
      LOCAL,
      replying,
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { text: "ran:bot-a:oi" });
  }));

test("refuses without a token, remote callers and no-token setups", () =>
  withDb(async (db) => {
    const body = { botId: "bot-a", prompt: "oi" };
    const off = await handleAutomationRun(post("x", body), db, LOCAL, replying);
    assert.equal(off.status, 404);
    const token = createAutomationToken(db, 1);
    const none = await handleAutomationRun(
      post(null, body),
      db,
      LOCAL,
      replying,
    );
    assert.equal(none.status, 401);
    const remote = await handleAutomationRun(
      post(token, body),
      db,
      "198.51.100.2",
      replying,
    );
    assert.equal(remote.status, 403);
  }));

test("validates input and maps runner failures", () =>
  withDb(async (db) => {
    const token = createAutomationToken(db, 1);
    const run = (body: unknown, runner = replying) =>
      handleAutomationRun(post(token, body), db, LOCAL, runner);
    assert.equal((await run("not json")).status, 400);
    assert.equal((await run({ botId: "bot-a" })).status, 400);
    assert.equal((await run({ botId: "bot-a", prompt: "  " })).status, 400);
    const big = await run({ botId: "bot-a", prompt: "x".repeat(20_000) });
    assert.equal(big.status, 413);
    const failed = await run({ botId: "bot-a", prompt: "oi" }, async () => ({
      kind: "failed",
      reason: "provider_off",
    }));
    assert.equal(failed.status, 502);
    assert.deepEqual(await failed.json(), { error: "provider_off" });
    const missing = await run({ botId: "bot-a", prompt: "oi" }, async () => ({
      kind: "failed",
      reason: "bot_missing",
    }));
    assert.equal(missing.status, 404);
  }));

test("runs a saved routine by id", () =>
  withDb(async (db) => {
    const token = createAutomationToken(db, 1);
    saveRoutine(db, routine(), 1);
    const res = await handleAutomationRun(
      post(token, { routineId: "r1" }),
      db,
      LOCAL,
      replying,
    );
    assert.deepEqual(await res.json(), {
      text: "ran:bot-a:Resuma os PRs abertos",
    });
    const unknown = await handleAutomationRun(
      post(token, { routineId: "nope" }),
      db,
      LOCAL,
      replying,
    );
    assert.equal(unknown.status, 404);
  }));

test("token routes are loopback only and never echo the stored token", () =>
  withDb(async (db) => {
    assert.equal(handleTokenStatus(db, "198.51.100.2").status, 403);
    assert.equal(handleTokenCreate(db, "198.51.100.2").status, 403);
    assert.equal(handleTokenRevoke(db, undefined).status, 403);
    assert.deepEqual(await handleTokenStatus(db, LOCAL).json(), {
      exists: false,
    });
    const created = await handleTokenCreate(db, LOCAL, () => 9).json();
    assert.match(created.token, /^obt_/);
    assert.equal(created.createdAt, 9);
    const status = await handleTokenStatus(db, LOCAL).json();
    assert.deepEqual(status, { exists: true, createdAt: 9 });
    assert.deepEqual(await handleTokenRevoke(db, LOCAL).json(), {
      revoked: true,
    });
  }));
