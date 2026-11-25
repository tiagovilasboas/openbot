import type { DatabaseSync } from "node:sqlite";
import type { BotProfile } from "../../bots/bot-types.ts";
import { ensureRoutinesSchema } from "./routines-schema.ts";

/**
 * Ends the goal link of every routine whose bot no longer has a goal, or
 * whose goal is done. The routines keep running and stay enabled; only the
 * goal context goes. A paused goal keeps its links for when it resumes.
 */
export function dropEndedGoalLinks(
  db: DatabaseSync,
  bots: readonly Pick<BotProfile, "id" | "goal">[],
): void {
  ensureRoutinesSchema(db);
  const drop = db.prepare(
    "UPDATE routines SET goal_linked = 0 WHERE bot_id = ? AND goal_linked = 1",
  );
  for (const bot of bots) {
    if (!bot.goal || bot.goal.status === "done") drop.run(bot.id);
  }
}
