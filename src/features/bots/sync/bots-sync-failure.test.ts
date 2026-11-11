import assert from "node:assert/strict";
import test from "node:test";
import { LANGUAGES } from "../../language/language.ts";
import { botsSyncMessage } from "./bots-sync-copy.ts";
import {
  botsSyncErrorCode,
  type BotsSyncErrorCode,
} from "./bots-sync-failure.ts";
import type { SyncFailure } from "./bots-sync-types.ts";

const http = (status: number, error?: string): SyncFailure => ({
  kind: "http",
  status,
  ...(error && { error }),
});

test("refusals map to their own codes", () => {
  assert.equal(
    botsSyncErrorCode(http(400, "main_bot_required")),
    "main_bot_required",
  );
  assert.equal(
    botsSyncErrorCode(http(413, "payload_too_large")),
    "payload_too_large",
  );
  assert.equal(botsSyncErrorCode(http(413)), "payload_too_large");
  assert.equal(botsSyncErrorCode(http(401, "unauthorized")), "unauthorized");
  assert.equal(botsSyncErrorCode(http(403)), "unauthorized");
  for (const error of ["invalid_bot", "too_many_bots", "too_many_skills"]) {
    assert.equal(botsSyncErrorCode(http(400, error)), "rejected");
  }
});

test("a lost connection or a server error is not shown", () => {
  assert.equal(botsSyncErrorCode({ kind: "network" }), null);
  assert.equal(botsSyncErrorCode(http(500)), null);
  assert.equal(botsSyncErrorCode(http(503)), null);
});

test("every code has copy in every language", () => {
  const codes: BotsSyncErrorCode[] = [
    "main_bot_required",
    "payload_too_large",
    "unauthorized",
    "rejected",
  ];
  for (const language of LANGUAGES) {
    for (const code of codes) {
      assert.ok(botsSyncMessage(language, code).length > 10);
    }
  }
  assert.notEqual(
    botsSyncMessage("pt", "main_bot_required"),
    botsSyncMessage("en", "main_bot_required"),
  );
});
