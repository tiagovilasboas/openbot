import type { DatabaseSync } from "node:sqlite";
import { latestUpdateByBot } from "../../conversations/server/conversations-repository.ts";
import type { LastInteraction } from "./idle-pause.ts";

/**
 * The bot's last chat activity, from the synced conversations: a thread is
 * rewritten when the person sends a message and the bot answers, while a
 * routine's own thread never reaches it. The latest update across all of the
 * bot's threads counts. One read per tick.
 */
export function conversationActivity(db: DatabaseSync): LastInteraction {
  const byBot = latestUpdateByBot(db);
  return (botId) => byBot.get(botId) ?? null;
}
