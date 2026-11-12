import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  appendAudit,
  AUDIT_MAX_ROWS,
  digestArgs,
  listRecentAudit,
} from "./audit-repository.ts";
import {
  deleteGrantsForBot,
  grantTool,
  listGrants,
  revokeTool,
} from "./grants-repository.ts";
import {
  closePendingTurn,
  createPendingTurn,
  expirePendingForBot,
  loadPendingTurn,
  PENDING_TURN_TTL_MS,
  TRANSCRIPT_MAX_BYTES,
  type NewPendingTurn,
} from "./pending-turns-repository.ts";

function withDb(run: (db: DatabaseSync) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-tools-"));
  const db = openLocalStore(dir);
  try {
    run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const turn = (botId: string, transcript = "[]"): NewPendingTurn => ({
  botId,
  transcript,
  pendingCalls: "[]",
  requestDigest: "d",
  stepsUsed: 1,
  callsUsed: 1,
});

test("pending turn: create, load, and random ids", () => {
  withDb((db) => {
    const a = createPendingTurn(db, turn("b1"), 1000);
    assert.equal(a.ok, true);
    if (!a.ok) return;
    assert.equal(a.turn.expiresAt, 1000 + PENDING_TURN_TTL_MS);
    assert.equal(loadPendingTurn(db, "b1", 2000)?.id, a.turn.id);
    assert.equal(loadPendingTurn(db, "b2", 2000), null);
    const b = createPendingTurn(db, turn("b2"));
    assert.ok(b.ok && b.turn.id !== a.turn.id);
  });
});

test("only one pending turn per bot: a new one expires the older", () => {
  withDb((db) => {
    const first = createPendingTurn(db, turn("b1"), 1000);
    const second = createPendingTurn(db, turn("b1"), 2000);
    assert.ok(first.ok && second.ok);
    if (!first.ok || !second.ok) return;
    assert.equal(loadPendingTurn(db, "b1", 3000)?.id, second.turn.id);
    assert.equal(closePendingTurn(db, first.turn.id, "completed"), false);
  });
});

test("transcript above 256 KB is refused", () => {
  withDb((db) => {
    const big = createPendingTurn(
      db,
      turn("b1", "x".repeat(TRANSCRIPT_MAX_BYTES + 1)),
    );
    assert.deepEqual(big, { ok: false, error: "transcript_too_large" });
    assert.equal(loadPendingTurn(db, "b1"), null);
  });
});

test("closing marks status once and frees the bot slot", () => {
  withDb((db) => {
    const created = createPendingTurn(db, turn("b1"));
    assert.ok(created.ok);
    if (!created.ok) return;
    assert.equal(closePendingTurn(db, created.turn.id, "denied"), true);
    assert.equal(closePendingTurn(db, created.turn.id, "completed"), false);
    assert.equal(loadPendingTurn(db, "b1"), null);
    assert.ok(createPendingTurn(db, turn("b1")).ok);
  });
});

test("expire-all-for-bot only touches that bot", () => {
  withDb((db) => {
    createPendingTurn(db, turn("b1"));
    createPendingTurn(db, turn("b2"));
    assert.equal(expirePendingForBot(db, "b1"), 1);
    assert.equal(loadPendingTurn(db, "b1"), null);
    assert.ok(loadPendingTurn(db, "b2"));
    assert.equal(expirePendingForBot(db, "b1"), 0);
  });
});

test("a turn past expires_at reads as absent", () => {
  withDb((db) => {
    createPendingTurn(db, turn("b1"), 1000);
    assert.ok(loadPendingTurn(db, "b1", 1000 + PENDING_TURN_TTL_MS - 1));
    assert.equal(loadPendingTurn(db, "b1", 1000 + PENDING_TURN_TTL_MS), null);
  });
});

test("grants: grant is idempotent, scoped, revocable, bulk deletable", () => {
  withDb((db) => {
    grantTool(db, "b1", "memory.add_note", 1);
    grantTool(db, "b1", "memory.add_note", 2);
    grantTool(db, "b1", "other", 3);
    grantTool(db, "b2", "memory.add_note", 4);
    assert.deepEqual(
      listGrants(db, "b1").map((g) => g.toolName),
      ["memory.add_note", "other"],
    );
    assert.equal(listGrants(db, "b1")[0].grantedAt, 1);
    revokeTool(db, "b1", "other");
    assert.equal(listGrants(db, "b1").length, 1);
    deleteGrantsForBot(db, "b1");
    deleteGrantsForBot(db, "b1");
    assert.equal(listGrants(db, "b1").length, 0);
    assert.equal(listGrants(db, "b2").length, 1);
  });
});

const entry = (callId: string) => ({
  at: 1,
  botId: "b1",
  turnId: "t1",
  callId,
  toolName: "memory.add_note",
  policy: "ask",
  decision: "once",
  outcome: "ok",
  durationMs: 5,
});

test("audit stores only the args digest", () => {
  withDb((db) => {
    appendAudit(db, entry("c1"), '{"text":"private note"}');
    const [row] = listRecentAudit(db);
    assert.equal(row.argsSha256, digestArgs('{"text":"private note"}'));
    assert.match(row.argsSha256, /^[0-9a-f]{64}$/);
    const raw = JSON.stringify(db.prepare("SELECT * FROM tool_audit").all());
    assert.equal(raw.includes("private note"), false);
  });
});

test("audit is trimmed to the last 1000 rows and lists newest first", () => {
  withDb((db) => {
    for (let i = 0; i < AUDIT_MAX_ROWS + 5; i += 1) {
      appendAudit(db, entry(`c${i}`), "{}");
    }
    const count = db.prepare("SELECT COUNT(*) AS n FROM tool_audit").get() as {
      n: number;
    };
    assert.equal(count.n, AUDIT_MAX_ROWS);
    const recent = listRecentAudit(db, 2);
    assert.equal(recent[0].callId, `c${AUDIT_MAX_ROWS + 4}`);
    assert.equal(recent.length, 2);
  });
});
