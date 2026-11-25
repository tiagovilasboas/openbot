import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { migrate } from "../../../shared/local-store/migrate.ts";
import {
  CONVERSATIONS_MIGRATIONS,
  addThreadId,
} from "./conversations-schema.ts";

function v1Db(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  migrate(db, "conversations", CONVERSATIONS_MIGRATIONS.slice(0, 1));
  const insert = db.prepare(
    "INSERT INTO conversations (bot_id, data, count, updated_at) VALUES (?, ?, ?, ?)",
  );
  insert.run("a", '[{"id":1}]', 1, 100);
  insert.run("b", '[{"id":1},{"id":2}]', 2, 200);
  return db;
}

const version = (db: DatabaseSync) =>
  (
    db
      .prepare("SELECT version FROM schema_versions WHERE domain = ?")
      .get("conversations") as { version: number }
  ).version;

test("v1 rows migrate to v2 unchanged under thread 'default'", () => {
  const db = v1Db();
  migrate(db, "conversations", CONVERSATIONS_MIGRATIONS);
  assert.equal(version(db), 2);
  const rows = db
    .prepare(
      "SELECT bot_id, thread_id, data, count, updated_at FROM conversations ORDER BY bot_id",
    )
    .all();
  assert.deepEqual(
    rows.map((r) => ({ ...r })),
    [
      {
        bot_id: "a",
        thread_id: "default",
        data: '[{"id":1}]',
        count: 1,
        updated_at: 100,
      },
      {
        bot_id: "b",
        thread_id: "default",
        data: '[{"id":1},{"id":2}]',
        count: 2,
        updated_at: 200,
      },
    ],
  );
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO conversations (bot_id, thread_id, data, count, updated_at) VALUES ('a', 'default', '[]', 0, 1)",
      )
      .run(),
  );
  db.close();
});

test("a failure mid-step rolls back and leaves v1 intact", () => {
  const db = v1Db();
  const failing = (d: DatabaseSync) => {
    addThreadId(d);
    throw new Error("boom");
  };
  assert.throws(
    () => migrate(db, "conversations", [CONVERSATIONS_MIGRATIONS[0], failing]),
    /boom/,
  );
  assert.equal(version(db), 1);
  const cols = db.prepare("PRAGMA table_info(conversations)").all() as {
    name: string;
  }[];
  assert.deepEqual(
    cols.map((c) => c.name),
    ["bot_id", "data", "count", "updated_at"],
  );
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM conversations").get() as {
    n: number;
  };
  assert.equal(n, 2);
  const tmp = db
    .prepare("SELECT 1 FROM sqlite_master WHERE name = 'conversations_v2'")
    .get();
  assert.equal(tmp, undefined);
  db.close();
});
