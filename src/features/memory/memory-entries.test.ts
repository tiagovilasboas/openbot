import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEMORY_MAX_ENTRIES,
  MEMORY_MAX_ENTRY_LENGTH,
  MEMORY_MAX_TOTAL_LENGTH,
  addMemoryEntry,
  capMemoryTexts,
  clearMemory,
  editMemoryEntry,
  normalizeMemoryText,
  removeMemoryEntry,
  sanitizeMemoryEntries,
  type MemoryEntry,
} from "./memory-entries.ts";

const NOW = new Date("2026-03-01T10:00:00.000Z");

function entry(id: string, text: string): MemoryEntry {
  return { id, text, createdAt: NOW.toISOString() };
}

function filled(count: number, length = 10): MemoryEntry[] {
  return Array.from({ length: count }, (_, i) =>
    entry(`e${i}`, "x".repeat(length)),
  );
}

describe("add, edit, remove, clear", () => {
  it("adds a trimmed one-line note with an id and a date", () => {
    const result = addMemoryEntry([], "  likes   short\nanswers ", "m1", NOW);
    assert.deepEqual(result, {
      ok: true,
      entries: [entry("m1", "likes short answers")],
    });
  });

  it("rejects empty and over-long notes", () => {
    assert.deepEqual(addMemoryEntry([], "  \n ", "m1"), {
      ok: false,
      reason: "empty",
    });
    assert.deepEqual(addMemoryEntry([], 42, "m1"), {
      ok: false,
      reason: "empty",
    });
    const long = "x".repeat(MEMORY_MAX_ENTRY_LENGTH + 1);
    assert.deepEqual(addMemoryEntry([], long, "m1"), {
      ok: false,
      reason: "too_long",
    });
    const exact = "x".repeat(MEMORY_MAX_ENTRY_LENGTH);
    assert.equal(addMemoryEntry([], exact, "m1").ok, true);
  });

  it("stops at the entry count limit", () => {
    const full = filled(MEMORY_MAX_ENTRIES);
    assert.deepEqual(addMemoryEntry(full, "one more", "m1"), {
      ok: false,
      reason: "too_many",
    });
  });

  it("stops at the total length limit", () => {
    const near = filled(13, MEMORY_MAX_ENTRY_LENGTH); // 3900
    assert.deepEqual(addMemoryEntry(near, "y".repeat(101), "m1"), {
      ok: false,
      reason: "total_too_long",
    });
    assert.equal(addMemoryEntry(near, "y".repeat(100), "m1").ok, true);
  });

  it("edits one note and keeps its id and date", () => {
    const list = [entry("a", "old"), entry("b", "other")];
    const result = editMemoryEntry(list, "a", " new  text ");
    assert.deepEqual(result, {
      ok: true,
      entries: [entry("a", "new text"), entry("b", "other")],
    });
  });

  it("edit checks the total without counting the old text twice", () => {
    const list = filled(13, MEMORY_MAX_ENTRY_LENGTH);
    assert.equal(
      editMemoryEntry(list, "e0", "z".repeat(MEMORY_MAX_ENTRY_LENGTH)).ok,
      true,
    );
    assert.deepEqual(editMemoryEntry(list, "nope", "text"), {
      ok: false,
      reason: "not_found",
    });
    assert.deepEqual(editMemoryEntry(list, "e0", ""), {
      ok: false,
      reason: "empty",
    });
  });

  it("removes one note and clears all", () => {
    const list = [entry("a", "1"), entry("b", "2")];
    assert.deepEqual(removeMemoryEntry(list, "a"), [entry("b", "2")]);
    assert.deepEqual(removeMemoryEntry(list, "zzz"), list);
    assert.deepEqual(clearMemory(), []);
  });
});

describe("normalizeMemoryText", () => {
  it("collapses whitespace and control characters", () => {
    assert.equal(normalizeMemoryText("a\u0000b\r\n\tc\u2028d"), "a b c d");
    assert.equal(normalizeMemoryText(undefined), "");
  });
});

describe("capMemoryTexts", () => {
  it("returns nothing for non-arrays and drops non-strings", () => {
    assert.deepEqual(capMemoryTexts("a note"), []);
    assert.deepEqual(capMemoryTexts({ length: 1, 0: "a" }), []);
    assert.deepEqual(capMemoryTexts([1, null, {}, ["x"], "ok", "  "]), ["ok"]);
  });

  it("cuts oversized notes to the per-entry limit", () => {
    const [text] = capMemoryTexts(["a".repeat(5000)]);
    assert.equal(text.length, MEMORY_MAX_ENTRY_LENGTH);
  });

  it("keeps at most the entry limit", () => {
    const many = Array.from({ length: 200 }, () => "note");
    assert.equal(capMemoryTexts(many).length, MEMORY_MAX_ENTRIES);
  });

  it("keeps the leading notes that fit the total limit", () => {
    const big = "b".repeat(MEMORY_MAX_ENTRY_LENGTH);
    const texts = capMemoryTexts(Array.from({ length: 30 }, () => big));
    const total = texts.reduce((sum, t) => sum + t.length, 0);
    assert.equal(texts.length, 13);
    assert.ok(total <= MEMORY_MAX_TOTAL_LENGTH);
  });
});

describe("sanitizeMemoryEntries (storage and backup input)", () => {
  it("returns an empty list for anything that is not a list", () => {
    for (const bad of [null, undefined, "x", 7, {}, { 0: { text: "a" } }]) {
      assert.deepEqual(sanitizeMemoryEntries(bad), []);
    }
  });

  it("keeps valid entries and drops junk, extra fields and non-objects", () => {
    const result = sanitizeMemoryEntries([
      { id: "a", text: "keep", createdAt: "2026-01-01T00:00:00.000Z", x: 1 },
      "text",
      null,
      { id: "b" },
      { id: "c", text: 5 },
    ]);
    assert.deepEqual(result, [
      { id: "a", text: "keep", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("repairs missing, duplicate and oversized ids and bad dates", () => {
    const result = sanitizeMemoryEntries([
      { text: "one", createdAt: "not a date" },
      { id: "dup", text: "two" },
      { id: "dup", text: "three" },
      { id: "i".repeat(500), text: "four" },
    ]);
    assert.equal(result.length, 4);
    assert.equal(new Set(result.map((e) => e.id)).size, 4);
    assert.ok(result.every((e) => e.id.length <= 64));
    assert.equal(result[0].createdAt, new Date(0).toISOString());
  });

  it("applies every limit to an oversized stored list", () => {
    const stored = Array.from({ length: 100 }, (_, i) => ({
      id: `e${i}`,
      text: "q".repeat(1000),
    }));
    const result = sanitizeMemoryEntries(stored);
    assert.ok(result.length <= MEMORY_MAX_ENTRIES);
    assert.ok(result.every((e) => e.text.length <= MEMORY_MAX_ENTRY_LENGTH));
    const total = result.reduce((sum, e) => sum + e.text.length, 0);
    assert.ok(total <= MEMORY_MAX_TOTAL_LENGTH);
  });

  it("is inert to hostile __proto__ keys and prototype ids", () => {
    const hostile = JSON.parse(
      '[{"__proto__":{"polluted":true},"id":"__proto__","text":"safe","constructor":{"x":1}}]',
    );
    const result = sanitizeMemoryEntries(hostile);
    assert.equal(result.length, 1);
    assert.equal(result[0].text, "safe");
    assert.deepEqual(Object.keys(result[0]).sort(), [
      "createdAt",
      "id",
      "text",
    ]);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.equal(Object.getPrototypeOf(result[0]), Object.prototype);
  });
});
