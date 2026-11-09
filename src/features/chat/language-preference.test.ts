import assert from "node:assert/strict";
import test from "node:test";
import { loadLanguage, saveLanguage } from "./language-preference.ts";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  } as Storage;
}

const blocked = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
} as unknown as Storage;

test("nothing stored means Portuguese", () => {
  assert.equal(loadLanguage(memoryStorage()), "pt");
});

test("a saved language is loaded back", () => {
  const storage = memoryStorage();
  saveLanguage("en", storage);
  assert.equal(storage.getItem("openbot_language"), "en");
  assert.equal(loadLanguage(storage), "en");
  saveLanguage("pt", storage);
  assert.equal(loadLanguage(storage), "pt");
});

test("an invalid stored value falls back to Portuguese", () => {
  assert.equal(loadLanguage(memoryStorage({ openbot_language: "fr" })), "pt");
});

test("blocked storage neither throws nor breaks the default", () => {
  assert.equal(loadLanguage(blocked), "pt");
  assert.doesNotThrow(() => saveLanguage("en", blocked));
});
