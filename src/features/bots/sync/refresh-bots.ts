import type { BotProfile } from "../bot-types.ts";
import type { BotsApi } from "./bots-sync-types.ts";

type Deps = {
  api: Pick<BotsApi, "get">;
  /** True while local edits wait to be sent; they win and go out next. */
  hasUnsentEdits: () => boolean;
  save: (bots: BotProfile[]) => void;
};

/**
 * Takes the server's crew after a change made on the server (a bot tool).
 * Unlike the first load it runs every time, and it never overwrites local
 * edits that are still on their way to the server.
 */
export async function refreshBots(deps: Deps): Promise<boolean> {
  if (deps.hasUnsentEdits()) return false;
  const result = await deps.api.get();
  if (!result.ok || result.state.bots.length === 0) return false;
  if (deps.hasUnsentEdits()) return false;
  deps.save(result.state.bots);
  return true;
}
