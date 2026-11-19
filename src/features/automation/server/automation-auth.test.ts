import assert from "node:assert/strict";
import test from "node:test";
import { withDb } from "../../routines/server/routines-test-db.ts";
import {
  checkAutomationRequest,
  AUTOMATION_TOKEN_HEADER,
} from "./automation-auth.ts";
import { createAutomationToken } from "./automation-token-repository.ts";

const bearer = (token: string) =>
  new Headers({ host: "localhost:3000", authorization: `Bearer ${token}` });

test("refuses non-loopback and unknown addresses before anything else", () =>
  withDb((db) => {
    const token = createAutomationToken(db, 1);
    for (const address of ["203.0.113.9", undefined, "localhost"]) {
      assert.deepEqual(checkAutomationRequest(db, bearer(token), address), {
        ok: false,
        status: 403,
        error: "loopback_only",
      });
    }
  }));

test("is off when no token is configured", () =>
  withDb((db) => {
    assert.deepEqual(checkAutomationRequest(db, bearer("a"), "127.0.0.1"), {
      ok: false,
      status: 404,
      error: "automation_disabled",
    });
  }));

test("rejects a missing or wrong token and accepts the right one", () =>
  withDb((db) => {
    const token = createAutomationToken(db, 1);
    const missing = checkAutomationRequest(
      db,
      new Headers({ host: "localhost" }),
      "::1",
    );
    assert.deepEqual(missing, {
      ok: false,
      status: 401,
      error: "no_token",
    });
    const wrong = checkAutomationRequest(db, bearer("obt_nope"), "::1");
    assert.deepEqual(wrong, { ok: false, status: 401, error: "unauthorized" });
    assert.deepEqual(checkAutomationRequest(db, bearer(token), "::1"), {
      ok: true,
    });
    const viaHeader = new Headers({
      host: "127.0.0.1:3000",
      authorization: "Bearer access-token",
      [AUTOMATION_TOKEN_HEADER]: token,
    });
    assert.deepEqual(checkAutomationRequest(db, viaHeader, "127.0.0.1"), {
      ok: true,
    });
  }));
