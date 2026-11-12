import assert from "node:assert/strict";
import test from "node:test";
import type { SyncFailure } from "../../conversations/sync/conversations-sync-types.ts";
import type { UsageRecord } from "../usage-record.ts";
import { syncUsageOnLoad, type UsageLoadDeps } from "./sync-usage-on-load.ts";
import type { UsageResult } from "./usage-sync-types.ts";

const rec = (botId: string): UsageRecord => ({
  botId,
  day: "2026-01-02",
  inputTokens: 10,
  outputTokens: 5,
  calls: 1,
  callsWithoutUsage: 0,
});

const EMPTY: UsageRecord[] = [];

function harness(options: {
  server: UsageResult;
  local: UsageRecord[];
  unsynced?: boolean;
  putOk?: boolean;
  failure?: SyncFailure;
}) {
  const puts: UsageRecord[][] = [];
  const mirrored: UsageRecord[][] = [];
  const failures: SyncFailure[] = [];
  let local = options.local;
  let unsynced = options.unsynced ?? false;
  const deps: UsageLoadDeps = {
    api: {
      get: async () => options.server,
      put: async (records) => {
        puts.push([...records]);
        return options.putOk === false
          ? { ok: false, failure: options.failure! }
          : { ok: true };
      },
    },
    readLocal: () => local,
    isUnsynced: () => unsynced,
    setUnsynced: (value) => {
      unsynced = value;
    },
    mirror: (records) => {
      mirrored.push(records);
      local = records;
    },
    reportFailure: (failure) => failures.push(failure),
  };
  return {
    deps,
    puts,
    mirrored,
    failures,
    isUnsynced: () => unsynced,
    setLocal: (next: UsageRecord[]) => {
      local = next;
    },
  };
}

const found = (...records: UsageRecord[]): UsageResult => ({
  ok: true,
  records,
});

test("the server's log is mirrored without a PUT", async () => {
  const h = harness({ server: found(rec("a")), local: EMPTY });
  await syncUsageOnLoad(h.deps);
  assert.deepEqual(h.mirrored, [[rec("a")]]);
  assert.equal(h.puts.length, 0);
});

test("the same log on both sides does nothing", async () => {
  const h = harness({ server: found(rec("a")), local: [rec("a")] });
  await syncUsageOnLoad(h.deps);
  assert.equal(h.puts.length + h.mirrored.length, 0);
});

test("an empty server takes the local log once", async () => {
  const h = harness({ server: found(), local: [rec("a")] });
  await syncUsageOnLoad(h.deps);
  assert.deepEqual(h.puts, [[rec("a")]]);
});

test("both empty sends nothing", async () => {
  const h = harness({ server: found(), local: EMPTY });
  await syncUsageOnLoad(h.deps);
  assert.equal(h.puts.length + h.mirrored.length, 0);
});

test("an unreachable server keeps local and marks unsynced", async () => {
  const h = harness({
    server: { ok: false, failure: { kind: "network" } },
    local: [rec("a")],
  });
  await syncUsageOnLoad(h.deps);
  assert.equal(h.mirrored.length, 0);
  assert.equal(h.isUnsynced(), true);
});

test("an unreachable server with an empty cache stays unmarked", async () => {
  const h = harness({
    server: { ok: false, failure: { kind: "network" } },
    local: EMPTY,
  });
  await syncUsageOnLoad(h.deps);
  assert.equal(h.isUnsynced(), false);
});

test("undelivered local changes win over the server, an emptied log included", async () => {
  const h = harness({
    server: found(rec("a")),
    local: EMPTY,
    unsynced: true,
  });
  await syncUsageOnLoad(h.deps);
  assert.deepEqual(h.puts, [[]]);
  assert.equal(h.mirrored.length, 0);
  assert.equal(h.isUnsynced(), false);
});

test("a refused import is reported and leaves the flag set", async () => {
  const failure: SyncFailure = {
    kind: "http",
    status: 413,
    error: "payload_too_large",
  };
  const h = harness({
    server: found(),
    local: [rec("a")],
    putOk: false,
    failure,
  });
  await syncUsageOnLoad(h.deps);
  assert.deepEqual(h.failures, [failure]);
  assert.equal(h.isUnsynced(), true);
});

test("counting during the request is not overwritten", async () => {
  const h = harness({ server: found(rec("a")), local: EMPTY });
  const get = h.deps.api.get;
  h.deps.api.get = async () => {
    h.setLocal([rec("b")]);
    return get();
  };
  await syncUsageOnLoad(h.deps);
  assert.equal(h.mirrored.length + h.puts.length, 0);
});
