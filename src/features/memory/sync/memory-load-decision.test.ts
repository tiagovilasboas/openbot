import assert from "node:assert/strict";
import test from "node:test";
import type { MemoryEntry } from "../memory-entries.ts";
import { decideNotesLoad } from "./memory-load-decision.ts";
import type { NotesResult } from "./memory-sync-types.ts";

const note = (n: number, text = `note ${n}`): MemoryEntry => ({
  id: `mem_${n}`,
  text,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const serverWith = (...entries: MemoryEntry[]): NotesResult => ({
  ok: true,
  entries,
});
const down: NotesResult = { ok: false, failure: { kind: "network" } };

test("the server wins when it has notes", () => {
  const decision = decideNotesLoad({
    server: serverWith(note(1), note(2)),
    local: [note(1, "old")],
    unsynced: false,
  });
  assert.deepEqual(decision, {
    action: "use-server",
    entries: [note(1), note(2)],
  });
});

test("identical notes are left alone", () => {
  const decision = decideNotesLoad({
    server: serverWith(note(1)),
    local: [note(1)],
    unsynced: false,
  });
  assert.deepEqual(decision, { action: "keep-local" });
});

test("an empty server takes the browser's notes", () => {
  const decision = decideNotesLoad({
    server: serverWith(),
    local: [note(1)],
    unsynced: false,
  });
  assert.deepEqual(decision, { action: "import", entries: [note(1)] });
});

test("both empty does nothing", () => {
  const decision = decideNotesLoad({
    server: serverWith(),
    local: [],
    unsynced: false,
  });
  assert.deepEqual(decision, { action: "keep-local" });
});

test("undelivered local notes win over the server", () => {
  const decision = decideNotesLoad({
    server: serverWith(note(1)),
    local: [note(1), note(2)],
    unsynced: true,
  });
  assert.deepEqual(decision, {
    action: "import",
    entries: [note(1), note(2)],
  });
});

test("an undelivered clear wins over the server's old notes", () => {
  const decision = decideNotesLoad({
    server: serverWith(note(1)),
    local: [],
    unsynced: true,
  });
  assert.deepEqual(decision, { action: "import", entries: [] });
});

test("an unreachable server keeps the local notes", () => {
  const decision = decideNotesLoad({
    server: down,
    local: [note(1)],
    unsynced: false,
  });
  assert.deepEqual(decision, { action: "keep-local" });
});
