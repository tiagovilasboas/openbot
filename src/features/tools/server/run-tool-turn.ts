import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { runToolLoop } from "../run-tool-loop.ts";
import type {
  LoopAuditEntry,
  StepFn,
  ToolLoopOutcome,
} from "../tool-loop-types.ts";
import type { ToolRegistry } from "../tool-registry.ts";
import type { ToolTurnEvent } from "../tool-turn-events.ts";
import { appendAudit, digestArgs } from "./audit-repository.ts";
import { listGrants } from "./grants-repository.ts";
import type { DecodedTurn } from "./pending-turn-codec.ts";
import { createPendingTurn } from "./pending-turns-repository.ts";
import type { ResumeRequest } from "./resume-turn.ts";
import { emptyBudget } from "../tool-budget.ts";

export type ToolTurnRun = {
  db: DatabaseSync;
  botId: string;
  requestDigest: string;
  tools: ToolRegistry;
  step: StepFn;
  /** Notices the step raised (tools_unavailable), sent before the next event. */
  notices: ToolTurnEvent[];
  now: () => number;
  signal: AbortSignal;
  resume: { request: ResumeRequest; turn: DecodedTurn } | null;
};

/**
 * Runs the loop for one request and persists what it leaves behind: a pause
 * becomes a pending turn (from the server's own transcript), and every
 * decision and outcome lands in the audit log, whatever way the turn ends.
 */
export async function* runToolTurn(
  run: ToolTurnRun,
): AsyncGenerator<ToolTurnEvent> {
  const audits: LoopAuditEntry[] = [];
  const startId = run.resume?.request.turnId ?? randomUUID();
  let pausedId: string | null = null;
  const loop = runToolLoop({
    botId: run.botId,
    tools: run.tools,
    grants: listGrants(run.db, run.botId),
    step: run.step,
    budget: run.resume?.turn.budget ?? emptyBudget(),
    transcript: run.resume?.turn.transcript ?? [],
    ...(run.resume
      ? {
          resume: {
            pendingCalls: run.resume.turn.pendingCalls,
            decisions: run.resume.request.decisions,
          },
        }
      : {}),
    clock: run.now,
    audit: (entry) => audits.push(entry),
    digest: digestArgs,
    signal: run.signal,
  });
  try {
    let outcome: ToolLoopOutcome;
    for (;;) {
      const next = await loop.next();
      yield* run.notices.splice(0);
      if (next.done) {
        outcome = next.value;
        break;
      }
      yield next.value;
    }
    if (outcome.kind !== "approval_required") return;
    const created = createPendingTurn(
      run.db,
      {
        botId: run.botId,
        transcript: JSON.stringify(outcome.transcript),
        pendingCalls: JSON.stringify(outcome.pendingCalls),
        requestDigest: run.requestDigest,
        stepsUsed: outcome.budget.steps,
        callsUsed: outcome.budget.calls,
      },
      run.now(),
    );
    if (!created.ok) {
      yield { type: "error", code: "response_too_long", provider: null };
      return;
    }
    pausedId = created.turn.id;
    yield {
      type: "approval_required",
      turnId: created.turn.id,
      calls: outcome.pendingCalls.map((call) => ({
        callId: call.callId,
        name: call.name,
        preview: call.preview,
        argsDigest: call.argsDigest,
        allowAlways: run.tools.get(call.name)?.allowAlways === true,
      })),
      expiresAt: created.turn.expiresAt,
    };
  } finally {
    // Stops a loop the client left mid-way; a finished one ignores it.
    await loop.return({ kind: "aborted" }).catch(() => undefined);
    for (const { argsJson, ...entry } of audits) {
      const turnId =
        entry.decision === "asked" && pausedId ? pausedId : startId;
      appendAudit(
        run.db,
        { ...entry, at: run.now(), botId: run.botId, turnId },
        argsJson,
      );
    }
  }
}
