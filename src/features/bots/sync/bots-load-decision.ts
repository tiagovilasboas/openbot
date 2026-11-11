import { DEFAULT_BOT, type BotProfile } from "../bot-types.ts";
import { resolveMainBotId } from "../main-bot.ts";
import type {
  ApiResult,
  BotsPayload,
  BotsServerState,
  LocalSnapshot,
} from "./bots-sync-types.ts";

export type LoadDecision =
  | { action: "use-server"; state: BotsServerState }
  | { action: "import"; payload: BotsPayload }
  | { action: "seed"; payload: BotsPayload }
  | { action: "use-local" };

/** A payload for a bot list; the main bot resolves the way the client does. */
export function buildPayload(
  bots: BotProfile[],
  activeBotId: string,
  storedMainBotId: string | null,
): BotsPayload {
  return {
    bots,
    activeBotId,
    mainBotId: resolveMainBotId(storedMainBotId, bots) ?? bots[0]!.id,
  };
}

/**
 * What the first load does. The server is the source of truth, except when
 * it cannot be reached, or when this browser has edits it never delivered.
 * An empty server takes the browser's bots, else the presets.
 */
export function decideBotsLoad(input: {
  server: ApiResult;
  local: LocalSnapshot | null;
  unsynced: boolean;
  presets: readonly BotProfile[];
}): LoadDecision {
  const { server, local, unsynced, presets } = input;
  if (!server.ok) return { action: "use-local" };
  const importLocal = (snapshot: LocalSnapshot): LoadDecision => ({
    action: "import",
    payload: buildPayload(
      snapshot.bots,
      snapshot.activeBotId,
      snapshot.storedMainBotId,
    ),
  });
  if (local && unsynced) return importLocal(local);
  if (server.state.bots.length > 0) {
    return { action: "use-server", state: server.state };
  }
  if (local) return importLocal(local);
  return {
    action: "seed",
    payload: buildPayload([...presets], DEFAULT_BOT.id, null),
  };
}
