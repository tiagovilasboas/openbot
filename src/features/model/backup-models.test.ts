import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBackupModelIds,
  parseBackupModelsText,
  sanitizeBackupModelIds,
  usableBackupModelIds,
} from "./backup-models.ts";
import { parseChatRequest } from "./parse-chat-request.ts";

test("stored backups drop bad entries and repeats and stop at three", () => {
  assert.deepEqual(
    sanitizeBackupModelIds(["a/b", "a/b", "bad id", 4, "c", "d", "e"]),
    ["a/b", "c", "d"],
  );
  assert.deepEqual(sanitizeBackupModelIds("a"), []);
  assert.deepEqual(sanitizeBackupModelIds(undefined), []);
});

test("a request list is strict: too many or invalid ids are refused", () => {
  assert.deepEqual(parseBackupModelIds(undefined), { ok: true, ids: [] });
  assert.deepEqual(parseBackupModelIds(["a", " b "]), {
    ok: true,
    ids: ["a", "b"],
  });
  assert.deepEqual(parseBackupModelIds(["a", "b", "c", "d"]), { ok: false });
  assert.deepEqual(parseBackupModelIds(["bad id"]), { ok: false });
  assert.deepEqual(parseBackupModelIds("a"), { ok: false });
});

test("the editor text splits on commas and spaces", () => {
  assert.deepEqual(parseBackupModelsText("a/b, c:free\nd"), {
    ok: true,
    ids: ["a/b", "c:free", "d"],
  });
  assert.deepEqual(parseBackupModelsText(""), { ok: true, ids: [] });
  assert.equal(parseBackupModelsText("a,b,c,d").ok, false);
});

test("usable backups skip the failed model and honour the allow-list", () => {
  assert.deepEqual(usableBackupModelIds(["m", "x", "y"], "m", {}), ["x", "y"]);
  assert.deepEqual(
    usableBackupModelIds(["x", "y"], undefined, {
      OPENBOT_ALLOWED_MODELS: "y",
    }),
    ["y"],
  );
  assert.deepEqual(usableBackupModelIds(undefined, "m", {}), []);
});

test("the chat request carries the backups and refuses a bad list", () => {
  const base = {
    language: "en",
    messages: [{ role: "user", text: "hi" }],
  };
  const ok = parseChatRequest({ ...base, backupModelIds: ["a", "b"] });
  assert.ok(ok.ok);
  assert.deepEqual(ok.ok && ok.request.backupModelIds, ["a", "b"]);
  assert.equal(
    parseChatRequest({ ...base, backupModelIds: ["a b"] }).ok,
    false,
  );
  const none = parseChatRequest(base);
  assert.ok(none.ok);
  assert.equal(none.ok && "backupModelIds" in none.request, false);
});
