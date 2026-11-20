import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_BOT } from "../bot-types.ts";
import { refreshBots } from "./refresh-bots.ts";

const state = (bots = [DEFAULT_BOT]) => ({
  ok: true as const,
  state: { bots, activeBotId: null, mainBotId: null },
});

test("every call reads the server again and saves its crew", async () => {
  let gets = 0;
  const saved: unknown[] = [];
  const deps = {
    api: { get: async () => (gets++, state()) },
    hasUnsentEdits: () => false,
    save: (bots: unknown) => void saved.push(bots),
  };
  assert.equal(await refreshBots(deps), true);
  assert.equal(await refreshBots(deps), true);
  assert.equal(gets, 2);
  assert.equal(saved.length, 2);
});

test("local edits still on their way are never overwritten", async () => {
  let unsent = true;
  const saved: unknown[] = [];
  const deps = {
    api: { get: async () => state() },
    hasUnsentEdits: () => unsent,
    save: (bots: unknown) => void saved.push(bots),
  };
  assert.equal(await refreshBots(deps), false);
  unsent = false;
  const racing = {
    ...deps,
    api: {
      get: async () => {
        unsent = true; // an edit lands while the GET is in flight
        return state();
      },
    },
  };
  assert.equal(await refreshBots(racing), false);
  assert.equal(saved.length, 0);
});

test("a failed or empty answer changes nothing", async () => {
  const saved: unknown[] = [];
  for (const get of [
    async () => ({ ok: false as const, failure: { kind: "network" as const } }),
    async () => state([]),
  ]) {
    assert.equal(
      await refreshBots({
        api: { get },
        hasUnsentEdits: () => false,
        save: (b) => void saved.push(b),
      }),
      false,
    );
  }
  assert.equal(saved.length, 0);
});
