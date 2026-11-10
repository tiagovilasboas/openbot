import assert from "node:assert/strict";
import test from "node:test";
import type { BackupStorage, RestoreMode } from "./backup-types.ts";
import { parseBackup } from "./parse-backup.ts";
import { restoreBackup } from "./restore-backup.ts";

/** A store that fails its Nth setItem (or the Nth removeItem) once. */
class FlakyStorage implements BackupStorage {
  readonly map = new Map<string, string>();
  setCalls = 0;
  removeCalls = 0;
  failSetAt = Infinity;
  failRemoveAt = Infinity;
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.setCalls += 1;
    if (this.setCalls === this.failSetAt) throw new Error("QuotaExceeded");
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.removeCalls += 1;
    if (this.removeCalls === this.failRemoveAt) throw new Error("Blocked");
    this.map.delete(key);
  }
}

const bot = (id: string) => ({
  id,
  name: id,
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
const msg = (text: string) => ({ id: 1, role: "user", language: "en", text });
const note = { id: "m1", text: "likes tea", createdAt: "2026-01-01" };

function seeded(): FlakyStorage {
  const s = new FlakyStorage();
  s.map.set("openbot_bots", JSON.stringify([bot("old1"), bot("old2")]));
  s.map.set("openbot_active_bot_id", "old1");
  s.map.set("openbot_main_bot_id", "old2");
  s.map.set("openbot_language", "pt");
  s.map.set("openbot_msgs_old1", JSON.stringify([msg("old chat 1")]));
  s.map.set("openbot_msgs_old2", JSON.stringify([msg("old chat 2")]));
  s.map.set("openbot_memory_old1", JSON.stringify([note]));
  s.map.set("openbot_usage", "[]");
  return s;
}

function incoming() {
  const result = parseBackup(
    JSON.stringify({
      app: "openbot",
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      data: {
        bots: [bot("new1"), bot("new2")],
        activeBotId: "new2",
        mainBotId: "new1",
        language: "en",
        messages: {
          new1: [msg("new chat 1")],
          new2: [msg("new chat 2")],
        },
        memory: { new1: [note], new2: [note] },
      },
    }),
  );
  assert.ok(result.ok);
  return result.backup;
}

function snapshot(s: FlakyStorage) {
  return [...s.map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** How many setItem and removeItem calls a clean restore makes. */
function countCalls(mode: RestoreMode) {
  const probe = seeded();
  restoreBackup(incoming(), probe, mode);
  return { sets: probe.setCalls, removes: probe.removeCalls };
}

for (const mode of ["replace", "merge"] as const) {
  test(`${mode}: a failing write at any point leaves the store untouched`, () => {
    const { sets } = countCalls(mode);
    assert.ok(sets > 3);
    // The seed itself used setItem on the Map directly, so counts are clean.
    for (let n = 1; n <= sets; n += 1) {
      const store = seeded();
      const before = snapshot(store);
      store.failSetAt = n;
      assert.throws(
        () => restoreBackup(incoming(), store, mode),
        /QuotaExceeded/,
        `failure at setItem ${n}`,
      );
      assert.deepEqual(snapshot(store), before, `rollback after setItem ${n}`);
    }
  });
}

test("replace: a failing removal also rolls everything back", () => {
  const { removes } = countCalls("replace");
  assert.ok(removes > 0);
  for (let n = 1; n <= removes; n += 1) {
    const store = seeded();
    const before = snapshot(store);
    store.failRemoveAt = n;
    assert.throws(() => restoreBackup(incoming(), store, "replace"), /Blocked/);
    assert.deepEqual(snapshot(store), before, `rollback after remove ${n}`);
  }
});

test("replace: old data is removed only after the new data is written", () => {
  const store = seeded();
  const order: string[] = [];
  const set = store.setItem.bind(store);
  const remove = store.removeItem.bind(store);
  store.setItem = (k, v) => (order.push(`set ${k}`), set(k, v));
  store.removeItem = (k) => (order.push(`remove ${k}`), remove(k));
  restoreBackup(incoming(), store, "replace");
  const firstRemove = order.findIndex((entry) => entry.startsWith("remove"));
  const lastSet = order.map((e) => e.startsWith("set")).lastIndexOf(true);
  assert.ok(firstRemove > lastSet, order.join(", "));
});

test("replace: a clean restore keeps only the new data and the usage log", () => {
  const store = seeded();
  const summary = restoreBackup(incoming(), store, "replace");
  assert.deepEqual(summary, { bots: 2, conversations: 2 });
  assert.equal(store.map.has("openbot_msgs_old1"), false);
  assert.equal(store.map.has("openbot_msgs_old2"), false);
  assert.equal(store.map.has("openbot_memory_old1"), false);
  assert.ok(store.map.has("openbot_msgs_new1"));
  assert.ok(store.map.has("openbot_memory_new2"));
  assert.equal(store.map.get("openbot_active_bot_id"), "new2");
  assert.equal(store.map.get("openbot_language"), "en");
  assert.equal(store.map.get("openbot_usage"), "[]");
});

test("merge: a clean restore keeps the old bots and adds the new ones", () => {
  const store = seeded();
  const summary = restoreBackup(incoming(), store, "merge");
  assert.deepEqual(summary, { bots: 2, conversations: 2 });
  assert.ok(store.map.has("openbot_msgs_old1"));
  assert.ok(store.map.has("openbot_msgs_new2"));
  assert.equal(store.map.get("openbot_language"), "pt");
  const ids = JSON.parse(store.map.get("openbot_bots") ?? "[]").map(
    (b: { id: string }) => b.id,
  );
  assert.deepEqual(ids, ["old1", "old2", "new1", "new2"]);
});
