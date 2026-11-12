import assert from "node:assert/strict";
import test from "node:test";
import type {
  SyncFailure,
  WriteResult,
} from "../../conversations/sync/conversations-sync-types.ts";
import type { MemoryEntry } from "../memory-entries.ts";
import type { MemoryApi, NotesResult } from "./memory-sync-types.ts";
import {
  syncMemoryOnLoad,
  type MemoryLoadDeps,
} from "./sync-memory-on-load.ts";

const note = (n: number): MemoryEntry => ({
  id: `mem_${n}`,
  text: `note ${n}`,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const EMPTY: MemoryEntry[] = []; // stable, like the real cache's empty list

function harness(options: {
  server: Record<string, NotesResult>;
  local: Record<string, MemoryEntry[]>;
  unsynced?: string[];
  putResult?: WriteResult;
}) {
  const puts: { botId: string; entries: readonly MemoryEntry[] }[] = [];
  const mirrored: { botId: string; entries: MemoryEntry[] }[] = [];
  const failures: SyncFailure[] = [];
  const local = { ...options.local };
  const unsynced = new Set(options.unsynced ?? []);
  const api: MemoryApi = {
    get: async (botId) => options.server[botId]!,
    put: async (botId, entries) => {
      puts.push({ botId, entries });
      return options.putResult ?? { ok: true };
    },
    remove: async () => ({ ok: true }),
  };
  const deps: MemoryLoadDeps = {
    api,
    botIds: () => Object.keys(options.server),
    readLocal: (botId) => local[botId] ?? EMPTY,
    isUnsynced: (botId) => unsynced.has(botId),
    setUnsynced: (botId, value) =>
      void (value ? unsynced.add(botId) : unsynced.delete(botId)),
    mirror: (botId, entries) => {
      mirrored.push({ botId, entries });
      local[botId] = entries;
    },
    reportFailure: (f) => failures.push(f),
  };
  return {
    deps,
    puts,
    mirrored,
    failures,
    local,
    isUnsynced: (botId = "a") => unsynced.has(botId),
  };
}

const found = (...entries: MemoryEntry[]): NotesResult => ({
  ok: true,
  entries,
});

test("the server's notes are mirrored into the cache without a PUT", async () => {
  const h = harness({ server: { a: found(note(1), note(2)) }, local: {} });
  await syncMemoryOnLoad(h.deps);
  assert.deepEqual(h.mirrored, [{ botId: "a", entries: [note(1), note(2)] }]);
  assert.equal(h.puts.length, 0);
  assert.equal(h.isUnsynced(), false);
});

test("an empty server takes the local notes once", async () => {
  const h = harness({
    server: { a: found(), b: found() },
    local: { a: [note(1)] },
  });
  await syncMemoryOnLoad(h.deps);
  assert.deepEqual(h.puts, [{ botId: "a", entries: [note(1)] }]);
});

test("both empty sends nothing", async () => {
  const h = harness({ server: { a: found() }, local: {} });
  await syncMemoryOnLoad(h.deps);
  assert.equal(h.puts.length + h.mirrored.length, 0);
});

test("an unreachable server keeps local and marks unsynced", async () => {
  const h = harness({
    server: { a: { ok: false, failure: { kind: "network" } } },
    local: { a: [note(1)] },
  });
  await syncMemoryOnLoad(h.deps);
  assert.deepEqual(h.local.a, [note(1)]);
  assert.equal(h.mirrored.length, 0);
  assert.equal(h.isUnsynced(), true);
});

test("a refused import is reported and leaves the flag set", async () => {
  const failure: SyncFailure = {
    kind: "http",
    status: 413,
    error: "payload_too_large",
  };
  const h = harness({
    server: { a: found() },
    local: { a: [note(1)] },
    putResult: { ok: false, failure },
  });
  await syncMemoryOnLoad(h.deps);
  assert.deepEqual(h.failures, [failure]);
  assert.equal(h.isUnsynced(), true);
});

test("a delivered import clears an old unsynced flag", async () => {
  const h = harness({
    server: { a: found() },
    local: { a: [note(1)] },
    unsynced: ["a"],
  });
  await syncMemoryOnLoad(h.deps);
  assert.equal(h.puts.length, 1);
  assert.equal(h.isUnsynced(), false);
});

test("notes saved while the request was out are not overwritten", async () => {
  const h = harness({ server: { a: found(note(1)) }, local: { a: [note(9)] } });
  const slowApi: MemoryApi = {
    ...h.deps.api,
    get: async () => {
      h.local.a = [note(9), note(10)];
      return found(note(1));
    },
  };
  await syncMemoryOnLoad({ ...h.deps, api: slowApi });
  assert.equal(h.mirrored.length, 0);
  assert.deepEqual(h.local.a, [note(9), note(10)]);
});

test("an undelivered clear is sent as an empty list, only for that bot", async () => {
  const h = harness({
    server: { a: found(note(1)), b: found(note(2)) },
    local: {},
    unsynced: ["a"],
  });
  await syncMemoryOnLoad(h.deps);
  assert.deepEqual(h.puts, [{ botId: "a", entries: [] }]);
  assert.deepEqual(h.mirrored, [{ botId: "b", entries: [note(2)] }]);
  assert.equal(h.isUnsynced("a"), false);
});
