// Ports and events of the tool loop. Pure types: no I/O here.
import type { ChatStreamEvent } from "../model/stream-events.ts";
import type { ToolExchange, ToolSpec } from "../model/tool-wire.ts";
import type { ToolBudget } from "./tool-budget.ts";
import type { ApprovalDecision, ToolPolicy } from "./tool-definition.ts";
import type { ToolGrant } from "./tool-policy.ts";
import type { ToolRegistry } from "./tool-registry.ts";

/** What one model step gets: the tools on offer and the exchanges so far. */
export type StepInput = { tools?: ToolSpec[]; toolTranscript: ToolExchange[] };

/** Streams one model step (with failover) as the plain chat stream events. */
export type StepFn = (input: StepInput) => AsyncIterable<ChatStreamEvent>;

type ModelEvent = Extract<
  ChatStreamEvent,
  { type: "start" | "delta" | "done" | "error" }
>;

/** What the loop streams to the client, besides the model's own events. */
export type ToolLoopEvent =
  | ModelEvent
  | {
      type: "tool_call";
      callId: string;
      name: string;
      preview: string;
      policy: ToolPolicy;
    }
  | { type: "tool_result"; callId: string; ok: boolean; preview: string }
  | { type: "memory_changed" };

/** A call waiting for the user, exactly as the server stored it. */
export type PendingCall = {
  callId: string;
  name: string;
  argsJson: string;
  argsDigest: string;
  preview: string;
};

/** A decision binds to a stored call id and the digest of its stored args. */
export type ResumeDecision = ApprovalDecision & { argsDigest: string };

export type LoopAuditEntry = {
  callId: string;
  toolName: string;
  policy: ToolPolicy;
  decision: "auto" | "asked" | "once" | "always" | "deny" | "rejected";
  outcome: string;
  durationMs: number;
  argsJson: string;
};

export type ToolLoopInput = {
  botId: string;
  tools: ToolRegistry;
  grants: readonly ToolGrant[];
  step: StepFn;
  /** Steps and calls already spent in this turn (they span resumes). */
  budget: ToolBudget;
  transcript: readonly ToolExchange[];
  resume?: {
    pendingCalls: readonly PendingCall[];
    decisions: readonly ResumeDecision[];
  };
  clock: () => number;
  audit: (entry: LoopAuditEntry) => void;
  /** sha256 hex of a string; injected so the loop stays free of node APIs. */
  digest: (text: string) => string;
  signal: AbortSignal;
};

export type ToolLoopOutcome =
  | { kind: "done"; transcript: ToolExchange[]; budget: ToolBudget }
  | { kind: "error"; transcript: ToolExchange[]; budget: ToolBudget }
  | { kind: "aborted" }
  | {
      kind: "approval_required";
      transcript: ToolExchange[];
      pendingCalls: PendingCall[];
      budget: ToolBudget;
    };
