import type { DatabaseSync } from "node:sqlite";
import type { StepFn } from "../tool-loop-types.ts";
import type { ToolRegistry } from "../tool-registry.ts";
import type { ToolPause } from "../tool-turn-events.ts";
import { runToolTurn, type ToolTurnRun } from "./run-tool-turn.ts";

export type BotToolsText =
  | { kind: "text"; text: string }
  /** A call waits for the user; the turn is stored and resumes on a decision. */
  | { kind: "paused"; pause: ToolPause }
  | { kind: "failed" };

export type BotToolsRun = {
  db: DatabaseSync;
  botId: string;
  tools: ToolRegistry;
  step: StepFn;
  signal: AbortSignal;
  /** Binds a pause to the request that made it (see requestDigest). */
  requestDigest: string;
  /** The decisions on a stored pause, already checked and claimed. */
  resume?: ToolTurnRun["resume"];
  now?: () => number;
};

/**
 * Runs one bot's tool loop where the reply is plain text (a group room):
 * calls the bot's grants and the user's levels allow run as in a 1:1 chat,
 * and a call that needs approval stores the turn as a pending turn, the same
 * way a 1:1 turn does, and reports the pause (an ask_user question pauses
 * the same way, with its question on the call). Every decision lands in the
 * audit log, as in a 1:1 turn.
 */
export async function runBotToolsText(run: BotToolsRun): Promise<BotToolsText> {
  const events = runToolTurn({
    db: run.db,
    botId: run.botId,
    requestDigest: run.requestDigest,
    tools: run.tools,
    step: run.step,
    notices: [],
    now: run.now ?? Date.now,
    signal: run.signal,
    resume: run.resume ?? null,
  });
  let text = "";
  let finished = false;
  try {
    for await (const event of events) {
      if (event.type === "delta") text += event.text;
      else if (event.type === "error") return { kind: "failed" };
      else if (event.type === "done") finished = true;
      else if (event.type === "approval_required") {
        const { turnId, calls, expiresAt } = event;
        return { kind: "paused", pause: { turnId, calls, expiresAt } };
      }
    }
  } finally {
    await events.return(undefined).catch(() => undefined);
  }
  return finished ? { kind: "text", text } : { kind: "failed" };
}
