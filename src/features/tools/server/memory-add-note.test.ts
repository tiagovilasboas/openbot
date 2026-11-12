import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  MEMORY_MAX_ENTRIES,
  MEMORY_MAX_ENTRY_LENGTH,
} from "../../memory/memory-entries.ts";
import {
  appendNote,
  readNotes,
} from "../../memory/server/memory-repository.ts";
import {
  createMemoryAddNoteTool,
  MEMORY_NOTE_ARG_MAX_CHARS,
} from "./memory-add-note.ts";

async function withDb(run: (db: DatabaseSync) => Promise<void> | void) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-note-tool-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const ctx = { botId: "bot_a", signal: new AbortController().signal };

test("appendNote adds a note and keeps the existing ones", async () => {
  await withDb((db) => {
    const first = appendNote(db, "bot_a", "  likes tea  ", 1000);
    assert.equal(first.ok, true);
    const second = appendNote(db, "bot_a", "lives in Recife", 2000);
    assert.ok(second.ok && second.count === 2);
    const stored = readNotes(db, "bot_a");
    assert.deepEqual(
      stored.entries.map((entry) => entry.text),
      ["likes tea", "lives in Recife"],
    );
    assert.equal(stored.updatedAt, 2000);
    assert.equal(readNotes(db, "bot_b").entries.length, 0);
  });
});

test("appendNote respects the memory caps with typed errors", async () => {
  await withDb((db) => {
    assert.deepEqual(appendNote(db, "bot_a", "   "), {
      ok: false,
      error: "empty",
    });
    assert.deepEqual(
      appendNote(db, "bot_a", "x".repeat(MEMORY_MAX_ENTRY_LENGTH + 1)),
      { ok: false, error: "too_long" },
    );
    for (let n = 0; n < MEMORY_MAX_ENTRIES; n += 1) {
      assert.ok(appendNote(db, "bot_a", `n${n}`).ok);
    }
    assert.deepEqual(appendNote(db, "bot_a", "one more"), {
      ok: false,
      error: "too_many",
    });
    assert.equal(readNotes(db, "bot_a").entries.length, MEMORY_MAX_ENTRIES);
  });
});

test("the note tool asks first and parses only a short text", () => {
  const tool = createMemoryAddNoteTool({} as DatabaseSync);
  assert.equal(tool.policy, "ask");
  assert.equal(tool.allowAlways, true);
  assert.deepEqual(tool.parseArgs({ text: " hi " }), {
    ok: true,
    args: { text: "hi" },
  });
  for (const bad of [
    null,
    {},
    { text: 3 },
    { text: " " },
    { text: "x".repeat(MEMORY_MAX_ENTRY_LENGTH + 1) },
  ]) {
    assert.equal(tool.parseArgs(bad).ok, false);
  }
});

test("the note tool's schema and parser share the memory cap", () => {
  const tool = createMemoryAddNoteTool({} as DatabaseSync);
  assert.equal(MEMORY_NOTE_ARG_MAX_CHARS, MEMORY_MAX_ENTRY_LENGTH);
  const text = tool.parameters.properties?.text as { maxLength?: number };
  assert.equal(text.maxLength, MEMORY_NOTE_ARG_MAX_CHARS);
  const atCap = "x".repeat(MEMORY_MAX_ENTRY_LENGTH);
  assert.deepEqual(tool.parseArgs({ text: atCap }), {
    ok: true,
    args: { text: atCap },
  });
});

test("the note tool saves to the bot and reports memory_changed", async () => {
  await withDb(async (db) => {
    const tool = createMemoryAddNoteTool(db);
    const result = await tool.run({ text: "prefers short answers" }, ctx);
    assert.deepEqual(result, {
      ok: true,
      text: "Saved note 1: prefers short answers",
      effect: { kind: "memory_changed" },
    });
    assert.equal(
      readNotes(db, "bot_a").entries[0].text,
      "prefers short answers",
    );
    const tooLong = await tool.run({ text: "y".repeat(400) }, ctx);
    assert.deepEqual(tooLong, { ok: false, code: "memory_too_long" });
  });
});
