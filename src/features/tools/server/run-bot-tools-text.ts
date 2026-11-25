import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { runToolLoop } from "../run-tool-loop.ts";
import { emptyBudget } from "../tool-budget.ts";
import type { LoopAuditEntry, StepFn } from "../tool-loop-types.ts";
import type { ToolRegistry } from "../tool-registry.ts";
import { appendAudit, digestArgs } from "./audit-repository.ts";
import { listGrants } from "./grants-repository.ts";
import { listToolLevels } from "./levels-repository.ts";

export type BotToolsText =
  | { kind: "text"; text: string }
  /** The model asked for tools that wait for the user; none of them ran. */
  | { kind: "needs_approval"; tools: string[] }
  | { kind: "failed" };

export type BotToolsRun = {
  db: DatabaseSync;
  botId: string;
  tools: ToolRegistry;
  step: StepFn;
  signal: AbortSignal;
  now?: () => number;
};

/**
 * Runs one bot's tool loop where nobody can approve a call (a group room):
 * calls the bot's grants and the user's levels allow run as in a 1:1 chat,
 * and a call that would pause for approval ends the turn without running.
 * Every decision lands in the audit log, as in a 1:1 turn.
 */
export async function runBotToolsText(run: BotToolsRun): Promise<BotToolsText> {
  const now = run.now ?? Date.now;
  const audits: LoopAuditEntry[] = [];
  const loop = runToolLoop({
    botId: run.botId,
    tools: run.tools,
    grants: listGrants(run.db, run.botId),
    levels: listToolLevels(run.db),
    step: run.step,
    budget: emptyBudget(),
    transcript: [],
    clock: now,
    audit: (entry) => audits.push(entry),
    digest: digestArgs,
    signal: run.signal,
  });
  let text = "";
  let failed = false;
  try {
    for (;;) {
      const next = await loop.next();
      if (next.done) {
        const outcome = next.value;
        if (outcome.kind === "approval_required") {
          const tools = outcome.pendingCalls.map((call) => call.name);
          return { kind: "needs_approval", tools: [...new Set(tools)] };
        }
        return outcome.kind === "done" && !failed
          ? { kind: "text", text }
          : { kind: "failed" };
      }
      if (next.value.type === "delta") text += next.value.text;
      if (next.value.type === "error") failed = true;
    }
  } finally {
    await loop.return({ kind: "aborted" }).catch(() => undefined);
    const turnId = randomUUID();
    for (const { argsJson, ...entry } of audits) {
      appendAudit(
        run.db,
        { ...entry, at: now(), botId: run.botId, turnId },
        argsJson,
      );
    }
  }
}
