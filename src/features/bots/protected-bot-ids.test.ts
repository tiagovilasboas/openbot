import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOTS_STORAGE_KEY } from "./bot-storage.ts";
import { DEFAULT_BOT } from "./bot-types.ts";
import { CREW_PRESETS } from "./crew-presets.ts";
import { protectedBotIdsFromStorage } from "./protected-bot-ids.ts";

const storing = (raw: string | null) => ({
  getItem: (key: string) => (key === BOTS_STORAGE_KEY ? raw : null),
});
const bot = (id: string) => ({ ...DEFAULT_BOT, id, name: `Bot ${id}` });

describe("protectedBotIdsFromStorage", () => {
  it("is null when no list is stored", () => {
    assert.equal(protectedBotIdsFromStorage(storing(null)), null);
  });
  it("is null when the stored list is broken, empty or not a list", () => {
    assert.equal(protectedBotIdsFromStorage(storing("{oops")), null);
    assert.equal(protectedBotIdsFromStorage(storing("[]")), null);
    assert.equal(protectedBotIdsFromStorage(storing('{"a":1}')), null);
    assert.equal(protectedBotIdsFromStorage(storing('[{"id":42}]')), null);
  });
  it("is null when reading storage throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(protectedBotIdsFromStorage(throwing), null);
  });
  it("keeps stored bots, the presets and the default bot", () => {
    const ids = protectedBotIdsFromStorage(
      storing(JSON.stringify([bot("bot_1"), bot("bot_2")])),
    );
    assert.ok(ids);
    assert.ok(ids.has("bot_1") && ids.has("bot_2"));
    assert.ok(ids.has(DEFAULT_BOT.id));
    for (const preset of CREW_PRESETS) assert.ok(ids.has(preset.id));
  });
});
