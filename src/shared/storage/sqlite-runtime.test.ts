import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// The local store is built on Node's own SQLite module, with no database
// dependency. This pins the runtime it needs and proves a file on disk
// survives closing and reopening.

test("the runtime is Node 24.15 or newer", () => {
  const [major, minor] = process.versions.node.split(".").map(Number);
  assert.ok(
    major > 24 || (major === 24 && minor >= 15),
    `Node ${process.version} is older than 24.15.0; run nvm use`,
  );
});

test("node:sqlite loads without an experimental warning", async () => {
  const warnings: string[] = [];
  const onWarning = (warning: Error) => warnings.push(warning.message);
  process.on("warning", onWarning);
  try {
    await import("node:sqlite");
    // Warnings are emitted on the next tick.
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    process.off("warning", onWarning);
  }
  assert.deepEqual(
    warnings.filter((message) => /sqlite/i.test(message)),
    [],
  );
});

test("a SQLite file keeps its rows after it is closed and reopened", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = mkdtempSync(join(tmpdir(), "openbot-sqlite-"));
  const file = join(dir, "store.db");
  try {
    const first = new DatabaseSync(file);
    first.exec("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)");
    first.prepare("INSERT INTO notes (body) VALUES (?)").run("kept");
    first.close();

    const second = new DatabaseSync(file);
    const row = second.prepare("SELECT body FROM notes").get();
    second.close();
    assert.deepEqual({ ...row }, { body: "kept" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
