import type { BotProfile } from "../bot-types.ts";
import { decideBotsLoad } from "./bots-load-decision.ts";
import type {
  BotsApi,
  BotsServerState,
  LocalSnapshot,
  SyncFailure,
} from "./bots-sync-types.ts";

export interface LoadDeps {
  api: BotsApi;
  readLocal(): LocalSnapshot | null;
  /** The agent this browser has open right now. */
  readActiveBotId(): string;
  isUnsynced(): boolean;
  setUnsynced(value: boolean): void;
  /** Makes the browser's own copy match the server (the read cache). */
  mirror(state: BotsServerState): void;
  presets: readonly BotProfile[];
  reportFailure(failure: SyncFailure): void;
}

export interface LoadOutcome {
  source: "server" | "imported" | "seeded" | "local";
  /** The main bot id the server holds, when known. */
  serverMainBotId: string | null;
  /** Whether the bot list is trusted enough to prune orphan bot data. */
  canPrune: boolean;
  /**
   * An agent was picked while the load was in flight. The pick was kept in
   * the browser and still has to be sent to the server.
   */
  pickedDuringLoad: boolean;
}

/**
 * Mirrors the server's answer, except the open agent when the person picked
 * one after the load began: their pick is newer than the answer.
 */
function mirrorKeepingPick(
  deps: LoadDeps,
  state: BotsServerState,
  activeAtStart: string,
): boolean {
  const picked = deps.readActiveBotId() !== activeAtStart;
  deps.mirror(picked ? { ...state, activeBotId: null } : state);
  return picked;
}

const usedLocal = (local: LocalSnapshot | null): LoadOutcome => ({
  source: "local",
  serverMainBotId: null,
  canPrune: local !== null,
  pickedDuringLoad: false,
});

/**
 * The first load of the bots: the server is the source of truth, and the
 * browser's copy is a cache. When the server is unreachable the browser's
 * bots are used as they are and the next load tries again.
 */
export async function syncBotsOnLoad(deps: LoadDeps): Promise<LoadOutcome> {
  const activeAtStart = deps.readActiveBotId();
  const server = await deps.api.get();
  const local = deps.readLocal();
  const decision = decideBotsLoad({
    server,
    local,
    unsynced: deps.isUnsynced(),
    presets: deps.presets,
  });

  if (decision.action === "use-server") {
    return {
      source: "server",
      serverMainBotId: decision.state.mainBotId,
      canPrune: true,
      pickedDuringLoad: mirrorKeepingPick(deps, decision.state, activeAtStart),
    };
  }
  if (decision.action === "use-local") return usedLocal(local);

  const result = await deps.api.put(decision.payload);
  const imported = decision.action === "import";
  if (result.ok) {
    const picked = mirrorKeepingPick(deps, result.state, activeAtStart);
    deps.setUnsynced(false);
    return {
      source: imported ? "imported" : "seeded",
      serverMainBotId: result.state.mainBotId,
      // Seeded presets say nothing about which other bots once existed.
      canPrune: imported,
      pickedDuringLoad: picked,
    };
  }
  deps.reportFailure(result.failure);
  deps.setUnsynced(true);
  return usedLocal(local);
}
