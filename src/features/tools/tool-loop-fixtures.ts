// Test doubles for the tool loop: a scripted step function and fake tools.
import { createHash } from "node:crypto";
import type { ChatStreamEvent } from "../model/stream-events.ts";
import { emptyBudget } from "./tool-budget.ts";
import type { ToolDefinition, ToolRunResult } from "./tool-definition.ts";
import type {
  LoopAuditEntry,
  StepInput,
  ToolLoopEvent,
  ToolLoopInput,
  ToolLoopOutcome,
} from "./tool-loop-types.ts";
import { createToolRegistry } from "./tool-registry.ts";

export const sha = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");

type Call = { id: string; name: string; args?: unknown };

/** One scripted model step: some text, some tool calls, or an error. */
export type ScriptedStep = { text?: string; calls?: Call[]; error?: boolean };

export function scriptedStep(steps: ScriptedStep[]) {
  const inputs: StepInput[] = [];
  const step = async function* (
    input: StepInput,
  ): AsyncGenerator<ChatStreamEvent> {
    inputs.push(input);
    const next = steps[inputs.length - 1] ?? { text: "fallback" };
    if (next.error) {
      yield { type: "error", code: "server", provider: "router", status: 500 };
      return;
    }
    yield { type: "start", provider: "router", model: "m" };
    if (next.text) yield { type: "delta", text: next.text };
    for (const call of next.calls ?? []) {
      yield {
        type: "tool_call",
        id: call.id,
        name: call.name,
        argsJson: JSON.stringify(call.args ?? {}),
      };
    }
    yield {
      type: "done",
      provider: "router",
      model: "m",
      usage: { inputTokens: 10, outputTokens: 1 },
    };
  };
  return { step, inputs };
}

type FakeToolOptions = Partial<ToolDefinition<unknown>> & {
  name: string;
  result?: ToolRunResult | (() => Promise<ToolRunResult>);
};

/** A tool that counts its runs and accepts any object as arguments. */
export function fakeTool(options: FakeToolOptions) {
  const runs: unknown[] = [];
  const tool: ToolDefinition<unknown> = {
    description: "fake",
    parameters: { type: "object" },
    policy: "auto",
    allowAlways: false,
    timeoutMs: 10_000,
    maxResultChars: 1000,
    parseArgs: (raw) =>
      typeof raw === "object" && raw !== null && !Array.isArray(raw)
        ? { ok: true, args: raw }
        : { ok: false },
    async run(args) {
      runs.push(args);
      const result = options.result ?? { ok: true, text: "fake result" };
      return typeof result === "function" ? result() : result;
    },
    ...options,
  };
  return { tool, runs };
}

export function loopInput(
  tools: ToolDefinition<unknown>[],
  step: ToolLoopInput["step"],
  extra: Partial<ToolLoopInput> = {},
) {
  const audit: LoopAuditEntry[] = [];
  const input: ToolLoopInput = {
    botId: "bot_1",
    tools: createToolRegistry(tools),
    grants: [],
    step,
    budget: emptyBudget(),
    transcript: [],
    clock: () => 0,
    audit: (entry) => audit.push(entry),
    digest: sha,
    signal: new AbortController().signal,
    ...extra,
  };
  return { input, audit };
}

/** Drains the loop: every event it streamed plus how it ended. */
export async function drain(
  loop: AsyncGenerator<ToolLoopEvent, ToolLoopOutcome>,
): Promise<{ events: ToolLoopEvent[]; outcome: ToolLoopOutcome }> {
  const events: ToolLoopEvent[] = [];
  for (;;) {
    const next = await loop.next();
    if (next.done) return { events, outcome: next.value };
    events.push(next.value);
  }
}
