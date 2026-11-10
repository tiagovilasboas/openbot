import assert from "node:assert/strict";
import test from "node:test";
import { MODEL_ID_MAX_LENGTH } from "../model/model-id.ts";
import {
  loadBotsFromStorage,
  sanitizeBotProfile,
  saveBotsToStorage,
} from "./bot-storage.ts";

const raw = {
  id: "bot_1",
  name: "Coder",
  description: "You write code.",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
};

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    length: 0,
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: () => null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

test("a bot keeps a trimmed, well-formed modelId", () => {
  const bot = sanitizeBotProfile({ ...raw, modelId: "  vendor/m-1:free " });
  assert.equal(bot?.modelId, "vendor/m-1:free");
});

test("a bot without a usable modelId has none", () => {
  for (const modelId of [
    undefined,
    "",
    "   ",
    7,
    "two words",
    "x".repeat(MODEL_ID_MAX_LENGTH + 1),
    "<script>",
  ]) {
    const bot = sanitizeBotProfile({ ...raw, modelId });
    assert.ok(bot);
    assert.ok(!("modelId" in bot), JSON.stringify(modelId));
  }
});

test("modelId survives a save and a load of the bot list", () => {
  const storage = memoryStorage();
  const bot = sanitizeBotProfile({ ...raw, modelId: "vendor/m" })!;
  const plain = sanitizeBotProfile({ ...raw, id: "bot_2", name: "Plain" })!;
  saveBotsToStorage([bot, plain], storage);
  const loaded = loadBotsFromStorage(storage);
  assert.equal(loaded[0]?.modelId, "vendor/m");
  assert.equal(loaded[1]?.modelId, undefined);
});
