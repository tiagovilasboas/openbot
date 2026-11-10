import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { buildBotTemplateFile } from "../bot-sharing/build-bot-template-file.ts";
import { parseBotTemplateFile } from "../bot-sharing/parse-bot-template-file.ts";
import {
  MEMORY_MAX_ENTRIES,
  MEMORY_MAX_ENTRY_LENGTH,
} from "../memory/memory-entries.ts";
import { loadMemoryEntries } from "../memory/memory-storage.ts";
import type { BackupStorage } from "./backup-types.ts";
import { buildBackup } from "./build-backup.ts";
import { parseBackup } from "./parse-backup.ts";
import { restoreBackup } from "./restore-backup.ts";

class FakeStorage implements BackupStorage {
  readonly map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const bot = (id: string): BotProfile => ({
  id,
  name: id,
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const note = (id: string, text: string) => ({
  id,
  text,
  createdAt: "2026-02-02T00:00:00.000Z",
});

function seeded(): FakeStorage {
  const s = new FakeStorage();
  s.setItem("openbot_bots", JSON.stringify([bot("a"), bot("b")]));
  s.setItem("openbot_memory_a", JSON.stringify([note("1", "likes tea")]));
  return s;
}

const envelope = (data: unknown) =>
  JSON.stringify({
    app: "openbot",
    version: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    data,
  });

describe("backup carries memory", () => {
  it("exports the notes of each bot and skips bots without any", () => {
    const backup = buildBackup(seeded(), "en");
    assert.deepEqual(Object.keys(backup.data.memory), ["a"]);
    assert.deepEqual(backup.data.memory.a, [note("1", "likes tea")]);
  });

  it("round-trips through parse and a replace restore", () => {
    const text = JSON.stringify(buildBackup(seeded(), "en"));
    const parsed = parseBackup(text);
    assert.ok(parsed.ok);
    const target = new FakeStorage();
    target.setItem("openbot_bots", JSON.stringify([bot("b")]));
    target.setItem("openbot_memory_b", JSON.stringify([note("9", "stale")]));
    restoreBackup(parsed.backup, target, "replace");
    assert.deepEqual(loadMemoryEntries("a", target), [note("1", "likes tea")]);
    // Replace swaps the old notes out too: nothing stale survives.
    assert.equal(target.getItem("openbot_memory_b"), null);
  });

  it("a merge restores the notes of the added bots only", () => {
    const parsed = parseBackup(JSON.stringify(buildBackup(seeded(), "en")));
    assert.ok(parsed.ok);
    const target = new FakeStorage();
    target.setItem("openbot_bots", JSON.stringify([bot("b")]));
    target.setItem("openbot_memory_b", JSON.stringify([note("9", "mine")]));
    restoreBackup(parsed.backup, target, "merge");
    assert.deepEqual(loadMemoryEntries("a", target), [note("1", "likes tea")]);
    assert.deepEqual(loadMemoryEntries("b", target), [note("9", "mine")]);
  });

  it("an older backup without memory still imports", () => {
    const parsed = parseBackup(envelope({ bots: [bot("a")], messages: {} }));
    assert.ok(parsed.ok);
    assert.deepEqual(Object.keys(parsed.backup.data.memory), []);
  });

  it("applies the caps and drops hostile or unknown entries", () => {
    const flood = Array.from({ length: 100 }, (_, i) => ({
      id: `e${i}`,
      text: "m".repeat(2000),
    }));
    const hostile = JSON.parse(
      '{"__proto__":[{"text":"proto"}],"constructor":[{"text":"ctor"}],"ghost":[{"text":"no such bot"}],"a":[{"__proto__":{"x":1},"text":"safe"}]}',
    );
    const text = envelope({
      bots: [bot("a"), bot("b")],
      messages: {},
      memory: { ...hostile, b: flood },
    });
    const parsed = parseBackup(text);
    assert.ok(parsed.ok);
    const memory = parsed.backup.data.memory;
    assert.deepEqual(Object.keys(memory).sort(), ["a", "b"]);
    assert.equal(memory.a.length, 1);
    assert.equal(memory.a[0].text, "safe");
    assert.ok(memory.b.length <= MEMORY_MAX_ENTRIES);
    assert.ok(memory.b.every((e) => e.text.length <= MEMORY_MAX_ENTRY_LENGTH));
    assert.equal(({} as Record<string, unknown>).x, undefined);
  });

  it("ignores a memory that is not an object", () => {
    for (const memory of [[], "x", 5, null]) {
      const parsed = parseBackup(
        envelope({ bots: [bot("a")], messages: {}, memory }),
      );
      assert.ok(parsed.ok);
      assert.deepEqual(Object.keys(parsed.backup.data.memory), []);
    }
  });
});

describe("the one-bot template never carries memory", () => {
  it("leaves the notes out of the exported file", () => {
    const s = seeded();
    const notes = loadMemoryEntries("a", s);
    assert.equal(notes.length, 1);
    const file = buildBotTemplateFile(bot("a"));
    const json = JSON.stringify(file);
    assert.ok(!json.includes("likes tea"));
    assert.ok(!json.toLowerCase().includes("memory"));
  });

  it("drops a memory field smuggled into an imported template", () => {
    const base = buildBotTemplateFile(bot("a"));
    const text = JSON.stringify({
      ...base,
      memory: [note("1", "leaked")],
      bot: { ...base.bot, memory: [note("2", "leaked too")] },
    });
    const parsed = parseBotTemplateFile(text);
    assert.ok(parsed.ok);
    assert.ok(!JSON.stringify(parsed).includes("leaked"));
  });
});
