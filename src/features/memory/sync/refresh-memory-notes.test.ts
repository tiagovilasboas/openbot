import assert from "node:assert/strict";
import test from "node:test";
import type { MemoryEntry } from "../memory-entries.ts";
import { refreshMemoryNotes } from "./refresh-memory-notes.ts";
import type { NotesResult } from "./memory-sync-types.ts";

const serverEntries = [{ text: "likes tea" }] as unknown as MemoryEntry[];

function deps(options: {
  unsynced?: boolean;
  result?: NotesResult;
  changeDuringRequest?: boolean;
}) {
  let local: MemoryEntry[] = [];
  const mirrored: MemoryEntry[][] = [];
  const gets: string[] = [];
  return {
    mirrored,
    gets,
    deps: {
      api: {
        async get(botId: string): Promise<NotesResult> {
          gets.push(botId);
          if (options.changeDuringRequest) local = [];
          return options.result ?? { ok: true, entries: serverEntries };
        },
        put: async () => ({ ok: true }) as never,
        remove: async () => ({ ok: true }) as never,
      },
      readLocal: () => local,
      isUnsynced: () => options.unsynced === true,
      mirror: (_botId: string, entries: MemoryEntry[]) => {
        mirrored.push(entries);
      },
    },
  };
}

test("the server's notes replace the cached ones", async () => {
  const run = deps({});
  await refreshMemoryNotes(run.deps, "b1");
  assert.deepEqual(run.gets, ["b1"]);
  assert.deepEqual(run.mirrored, [serverEntries]);
});

test("notes the server has not confirmed yet are never overwritten", async () => {
  const run = deps({ unsynced: true });
  await refreshMemoryNotes(run.deps, "b1");
  assert.deepEqual(run.gets, []);
  assert.deepEqual(run.mirrored, []);
});

test("a local change during the request, or a failed read, keeps the cache", async () => {
  const changed = deps({ changeDuringRequest: true });
  await refreshMemoryNotes(changed.deps, "b1");
  assert.deepEqual(changed.mirrored, []);
  const failed = deps({
    result: { ok: false, failure: { kind: "network" } },
  });
  await refreshMemoryNotes(failed.deps, "b1");
  assert.deepEqual(failed.mirrored, []);
});
