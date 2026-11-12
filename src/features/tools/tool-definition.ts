// Contracts of the approval-gated tool loop. Pure types: no I/O here.
// The tools domain may use the model domain's neutral wire types; the model
// domain never imports this one.
import type { JsonSchemaLite } from "../model/tool-wire.ts";

export type ToolPolicy = "auto" | "ask";

export type ApprovalDecision = {
  callId: string;
  decision: "once" | "always" | "deny";
};

// Describes a side effect a tool performed, so the loop can notify the client.
export type ToolEffect = { kind: "memory_changed" };

export type ToolRunContext = { botId: string; signal: AbortSignal };

export type ToolRunResult =
  { ok: true; text: string; effect?: ToolEffect } | { ok: false; code: string };

export type ParsedArgs<A> = { ok: true; args: A } | { ok: false };

export type ToolDefinition<A> = {
  name: string;
  description: string;
  parameters: JsonSchemaLite;
  policy: ToolPolicy;
  allowAlways: boolean;
  timeoutMs: number;
  maxResultChars: number;
  parseArgs(raw: unknown): ParsedArgs<A>;
  run(args: A, ctx: ToolRunContext): Promise<ToolRunResult>;
};

// A model-issued call, exactly as the provider streamed it.
export type ToolCallRequest = { id: string; name: string; argsJson: string };

export type ToolErrorCode = "unknown_tool" | "bad_json" | "bad_args";

export type ValidatedCall =
  | { ok: true; tool: ToolDefinition<unknown>; args: unknown }
  | { ok: false; code: ToolErrorCode };
