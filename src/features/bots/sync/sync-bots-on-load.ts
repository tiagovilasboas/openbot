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
}

/**
 * The first load of the bots: the server is the source of truth, and the
 * browser's copy is a cache. When the server is unreachable the browser's
 * bots are used as they are and the next load tries again.
 */
export async function syncBotsOnLoad(deps: LoadDeps): Promise<LoadOutcome> {
  const server = await deps.api.get();
  const local = deps.readLocal();
  const decision = decideBotsLoad({
    server,
    local,
    unsynced: deps.isUnsynced(),
    presets: deps.presets,
  });

  if (decision.action === "use-server") {
    deps.mirror(decision.state);
    return {
      source: "server",
      serverMainBotId: decision.state.mainBotId,
      canPrune: true,
    };
  }
  if (decision.action === "use-local") {
    return { source: "local", serverMainBotId: null, canPrune: local !== null };
  }

  const result = await deps.api.put(decision.payload);
  const imported = decision.action === "import";
  if (result.ok) {
    deps.mirror(result.state);
    deps.setUnsynced(false);
    return {
      source: imported ? "imported" : "seeded",
      serverMainBotId: result.state.mainBotId,
      // Seeded presets say nothing about which other bots once existed.
      canPrune: imported,
    };
  }
  deps.reportFailure(result.failure);
  deps.setUnsynced(true);
  return { source: "local", serverMainBotId: null, canPrune: local !== null };
}
