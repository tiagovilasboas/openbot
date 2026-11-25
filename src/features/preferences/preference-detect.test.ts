import assert from "node:assert/strict";
import test from "node:test";
import { addMemoryEntry } from "../memory/memory-entries.ts";
import {
  loadMemoryEntries,
  saveMemoryEntries,
  type MemoryStorage,
} from "../memory/memory-storage.ts";
import { detectPreference } from "./preference-detect.ts";
import { preferenceOffer } from "./preference-offer.ts";

test("recognises corrections in pt, en and es", () => {
  for (const text of [
    "Não, prefiro respostas curtas",
    "sempre responda em português",
    "Não use emojis",
    "No, I prefer tabs over spaces",
    "Always cite your sources.",
    "Don't use bullet lists",
    "from now on answer in English",
    "No, prefiero respuestas cortas",
    "Nunca uses jerga técnica",
    "deja de pedir confirmación",
  ]) {
    assert.ok(detectPreference(text), text);
  }
});

test("keeps the person's own words, normalized", () => {
  assert.equal(
    detectPreference("  Prefiro   respostas\ncurtas "),
    "Prefiro respostas curtas",
  );
});

test("ignores questions, passing remarks and long text", () => {
  for (const text of [
    "Você prefere café?",
    "What do you prefer?",
    "I don't know what to do",
    "Resuma este texto",
    "Never mind?",
    "",
  ]) {
    assert.equal(detectPreference(text), null, text);
  }
  assert.equal(detectPreference(`sempre ${"a".repeat(600)}`), null);
});

test("a detected preference reaches memory only on the explicit save", () => {
  const map = new Map<string, string>();
  const storage: MemoryStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
  const text = detectPreference("Não, prefiro respostas curtas")!;
  assert.deepEqual(loadMemoryEntries("bot-a", storage), []);
  assert.equal(map.size, 0, "detecting writes nothing");

  const added = addMemoryEntry([], text, "mem_1");
  assert.ok(added.ok);
  saveMemoryEntries("bot-a", added.entries, storage, { sync: false });
  assert.deepEqual(
    loadMemoryEntries("bot-a", storage).map((entry) => entry.text),
    ["Não, prefiro respostas curtas"],
  );
  assert.deepEqual(loadMemoryEntries("bot-b", storage), []);
});

test("offers only after the reply, once, and not when already saved", () => {
  const user = { id: 1, role: "user" as const, text: "Não use emojis" };
  const reply = { id: 2, role: "assistant" as const, text: "Certo." };
  assert.deepEqual(preferenceOffer([user, reply], []), {
    replyId: 2,
    text: "Não use emojis",
  });
  assert.equal(preferenceOffer([user], []), null);
  assert.equal(
    preferenceOffer([user, reply], [{ text: "Não use emojis" }]),
    null,
  );
  assert.equal(
    preferenceOffer([reply, { ...user, text: "Resuma isso" }, reply], []),
    null,
  );
});
