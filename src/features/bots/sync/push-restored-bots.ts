import { BOTS_MAX_COUNT } from "../bot-types.ts";
import type { ApiResult, BotsApi, BotsPayload } from "./bots-sync-types.ts";

/**
 * Sends the bots a backup restore just wrote to the browser. The server
 * refuses a list that drops its current main bot, so when the restored list
 * leaves it out, the old main bot rides along in a first request that
 * already names the restored main bot; the second request then drops it.
 */
export async function pushRestoredBots(
  api: BotsApi,
  payload: BotsPayload,
): Promise<ApiResult> {
  const server = await api.get();
  if (server.ok) {
    const { bots, mainBotId } = server.state;
    const oldMain = bots.find((bot) => bot.id === mainBotId);
    const dropsIt =
      oldMain && !payload.bots.some((bot) => bot.id === oldMain.id);
    if (oldMain && dropsIt && payload.bots.length < BOTS_MAX_COUNT) {
      const bridge = await api.put({
        ...payload,
        bots: [...payload.bots, oldMain],
      });
      if (!bridge.ok) return bridge;
    }
  }
  return api.put(payload);
}
