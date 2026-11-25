import type { DatabaseSync } from "node:sqlite";
import { ensureConversationsSchema } from "../../conversations/server/conversations-schema.ts";
import type { LastInteraction } from "./idle-pause.ts";

/**
 * The bot's last chat activity, from the synced conversations: a thread is
 * rewritten when the person sends a message and the bot answers, while a
 * routine's own thread never reaches it. The latest update across all of the
 * bot's threads counts. One read per tick.
 */
export function conversationActivity(db: DatabaseSync): LastInteraction {
  ensureConversationsSchema(db);
  const rows = db
    .prepare(
      "SELECT bot_id, MAX(updated_at) AS updated_at FROM conversations WHERE count > 0 GROUP BY bot_id",
    )
    .all() as { bot_id: string; updated_at: number }[];
  const byBot = new Map(rows.map((r) => [r.bot_id, r.updated_at]));
  return (botId) => byBot.get(botId) ?? null;
}
