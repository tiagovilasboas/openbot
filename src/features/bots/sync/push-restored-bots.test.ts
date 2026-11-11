import assert from "node:assert/strict";
import test from "node:test";
import { CREW_PRESETS } from "../crew-presets.ts";
import type { ApiResult, BotsApi, BotsPayload } from "./bots-sync-types.ts";
import { pushRestoredBots } from "./push-restored-bots.ts";

const [a, b, c] = CREW_PRESETS;

function fakeApi(serverBots: BotsPayload["bots"], mainBotId: string | null) {
  const puts: BotsPayload[] = [];
  const api: BotsApi = {
    get: async () => ({
      ok: true,
      state: { bots: serverBots, activeBotId: null, mainBotId },
    }),
    put: async (payload): Promise<ApiResult> => {
      puts.push(payload);
      return {
        ok: true,
        state: {
          bots: payload.bots,
          activeBotId: payload.activeBotId,
          mainBotId: payload.mainBotId,
        },
      };
    },
  };
  return { api, puts };
}

test("a restore that keeps the main bot is one request", async () => {
  const { api, puts } = fakeApi([a!], a!.id);
  const payload = { bots: [a!, b!], activeBotId: a!.id, mainBotId: a!.id };
  assert.ok((await pushRestoredBots(api, payload)).ok);
  assert.equal(puts.length, 1);
});

test("a restore that drops the main bot bridges it first, then drops it", async () => {
  const { api, puts } = fakeApi([a!, c!], a!.id);
  const payload = { bots: [b!], activeBotId: b!.id, mainBotId: b!.id };
  assert.ok((await pushRestoredBots(api, payload)).ok);
  assert.equal(puts.length, 2);
  assert.deepEqual(
    puts[0]!.bots.map((bot) => bot.id),
    [b!.id, a!.id],
  );
  assert.equal(puts[0]!.mainBotId, b!.id);
  assert.deepEqual(puts[1], payload);
});

test("a refused bridge stops there and reports the failure", async () => {
  const { api } = fakeApi([a!], a!.id);
  const refusing: BotsApi = {
    get: api.get,
    put: async () => ({
      ok: false,
      failure: { kind: "http", status: 400, error: "invalid_bot" },
    }),
  };
  const result = await pushRestoredBots(refusing, {
    bots: [b!],
    activeBotId: b!.id,
    mainBotId: b!.id,
  });
  assert.equal(result.ok, false);
});
