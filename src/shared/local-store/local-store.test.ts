import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ensureDataDir, resolveDataDir } from "./data-dir.ts";
import { openLocalStore } from "./local-store.ts";
import { migrate } from "./migrate.ts";

const mode = (path: string) => statSync(path).mode & 0o777;

function withTempDir(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-store-"));
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the data directory honours OPENBOT_DATA_DIR and defaults to ~/.openbot", () => {
  assert.equal(
    resolveDataDir({ env: { OPENBOT_DATA_DIR: "/data/x" }, home: "/h" }),
    "/data/x",
  );
  assert.equal(resolveDataDir({ env: {}, home: "/h" }), "/h/.openbot");
});

test("the data directory is created private and tightened when looser", () => {
  withTempDir((root) => {
    const dir = join(root, "nested", "data");
    ensureDataDir(dir);
    assert.equal(mode(dir), 0o700);
    chmodSync(dir, 0o755);
    ensureDataDir(dir);
    assert.equal(mode(dir), 0o700);
  });
});

test("the database file is private and keeps rows across reopen", () => {
  withTempDir((root) => {
    const dir = join(root, "data");
    mkdirSync(dir);
    const db = openLocalStore(dir);
    db.exec("CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('kept')");
    const file = join(dir, "openbot.db");
    assert.equal(mode(file), 0o600);
    for (const extra of [`${file}-wal`, `${file}-shm`]) {
      if (existsSync(extra)) assert.equal(mode(extra), 0o600);
    }
    assert.equal(db.prepare("PRAGMA foreign_keys").get()?.foreign_keys, 1);
    db.close();
    const again = openLocalStore(dir);
    assert.deepEqual(
      { ...again.prepare("SELECT v FROM t").get() },
      { v: "kept" },
    );
    again.close();
  });
});

test("migrate applies steps in order, is idempotent and applies only new steps", () => {
  withTempDir((dir) => {
    const db = openLocalStore(dir);
    const steps = [
      "CREATE TABLE a (id INTEGER)",
      (handle: typeof db) => handle.exec("INSERT INTO a VALUES (1)"),
    ];
    migrate(db, "bots", steps);
    migrate(db, "bots", steps);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM a").get()?.n, 1);
    migrate(db, "bots", [...steps, "ALTER TABLE a ADD COLUMN name TEXT"]);
    assert.equal(
      db.prepare("SELECT version FROM schema_versions").get()?.version,
      3,
    );
    db.close();
  });
});

test("a failing step rolls back and keeps the previous version", () => {
  withTempDir((dir) => {
    const db = openLocalStore(dir);
    migrate(db, "bots", ["CREATE TABLE a (id INTEGER)"]);
    assert.throws(() =>
      migrate(db, "bots", [
        "CREATE TABLE a (id INTEGER)",
        "CREATE TABLE b (id INTEGER); INSERT INTO missing VALUES (1)",
      ]),
    );
    const version = db
      .prepare("SELECT version FROM schema_versions WHERE domain = 'bots'")
      .get()?.version;
    assert.equal(version, 1);
    const b = db
      .prepare("SELECT name FROM sqlite_master WHERE name = 'b'")
      .get();
    assert.equal(b, undefined);
    db.close();
  });
});

test("a database from a newer app is refused", () => {
  withTempDir((dir) => {
    const db = openLocalStore(dir);
    migrate(db, "bots", [
      "CREATE TABLE a (id INTEGER)",
      "CREATE TABLE b (id INTEGER)",
    ]);
    assert.throws(
      () => migrate(db, "bots", ["CREATE TABLE a (id INTEGER)"]),
      /newer than/,
    );
    db.close();
  });
});

test("domains version independently", () => {
  withTempDir((dir) => {
    const db = openLocalStore(dir);
    migrate(db, "bots", ["CREATE TABLE a (id INTEGER)"]);
    migrate(db, "skills", [
      "CREATE TABLE s (id INTEGER)",
      "CREATE TABLE t (id INTEGER)",
    ]);
    const rows = db
      .prepare("SELECT domain, version FROM schema_versions ORDER BY domain")
      .all();
    assert.deepEqual(
      rows.map((r) => [r.domain, r.version]),
      [
        ["bots", 1],
        ["skills", 2],
      ],
    );
    db.close();
  });
});
