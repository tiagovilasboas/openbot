import assert from "node:assert/strict";
import test from "node:test";
import { withDb } from "../../routines/server/routines-test-db.ts";
import {
  automationTokenStatus,
  createAutomationToken,
  hashAutomationToken,
  revokeAutomationToken,
  verifyAutomationToken,
} from "./automation-token-repository.ts";

test("no token exists until one is created", () =>
  withDb((db) => {
    assert.deepEqual(automationTokenStatus(db), { exists: false });
    assert.equal(verifyAutomationToken(db, "x"), "no_token_configured");
  }));

test("creating stores only the hash and the token verifies", () =>
  withDb((db) => {
    const token = createAutomationToken(db, 5);
    assert.match(token, /^obt_[\w-]{43}$/);
    assert.deepEqual(automationTokenStatus(db), {
      exists: true,
      createdAt: 5,
    });
    const rows = JSON.stringify(
      db.prepare("SELECT * FROM automation_token").all(),
    );
    assert.ok(!rows.includes(token));
    assert.ok(rows.includes(hashAutomationToken(token)));
    assert.equal(verifyAutomationToken(db, token), "valid");
    assert.equal(verifyAutomationToken(db, token + "x"), "invalid");
    assert.equal(verifyAutomationToken(db, ""), "invalid");
  }));

test("rotating invalidates the old token; revoking switches it off", () =>
  withDb((db) => {
    const first = createAutomationToken(db, 1);
    const second = createAutomationToken(db, 2);
    assert.notEqual(first, second);
    assert.equal(verifyAutomationToken(db, first), "invalid");
    assert.equal(verifyAutomationToken(db, second), "valid");
    assert.equal(revokeAutomationToken(db), true);
    assert.equal(revokeAutomationToken(db), false);
    assert.equal(verifyAutomationToken(db, second), "no_token_configured");
  }));
