import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { replaceThread } from "../../conversations/server/conversations-repository.ts";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import { conversationActivity } from "./conversation-activity.ts";

test("activity is the latest update across a bot's threads", () => {
  const dir = mkdtempSync(join(tmpdir(), "openbot-activity-"));
  const db = openLocalStore(dir);
  try {
    const m = [{ id: 1, role: "user", text: "hi", language: "en" }];
    replaceThread(db, "a", m);
    replaceThread(db, "a", m, "t2");
    db.prepare(
      "UPDATE conversations SET updated_at = 500 WHERE bot_id = 'a' AND thread_id = 'default'",
    ).run();
    db.prepare(
      "UPDATE conversations SET updated_at = 900 WHERE bot_id = 'a' AND thread_id = 't2'",
    ).run();
    const last = conversationActivity(db);
    assert.equal(last("a"), 900);
    assert.equal(last("unknown"), null);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
