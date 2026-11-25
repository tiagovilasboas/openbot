import type { DatabaseSync } from "node:sqlite";
import { listThreads } from "../../conversations/server/conversations-repository.ts";
import type { LastInteraction } from "./idle-pause.ts";

/**
 * The bot's last chat activity, from the synced conversation: its thread is
 * rewritten when the person sends a message and the bot answers, while a
 * routine's own thread never reaches it. One read per tick.
 */
export function conversationActivity(db: DatabaseSync): LastInteraction {
  const byBot = new Map(listThreads(db).map((t) => [t.botId, t.updatedAt]));
  return (botId) => byBot.get(botId) ?? null;
}
