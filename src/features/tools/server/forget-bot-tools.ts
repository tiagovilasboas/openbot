import type { DatabaseSync } from "node:sqlite";
import { deleteGrantsForBot } from "./grants-repository.ts";
import { expirePendingForBot } from "./pending-turns-repository.ts";

/**
 * Tool state that must not outlive a bot: its always-allow grants and any
 * turn waiting for approval. Idempotent. The audit log is kept on purpose.
 */
export function forgetBotTools(db: DatabaseSync, botIds: readonly string[]) {
  for (const botId of botIds) {
    deleteGrantsForBot(db, botId);
    expirePendingForBot(db, botId);
  }
}
