// Contracts of the approval-gated tool loop. Pure types: no I/O here.

// Local on purpose: unify with the neutral type in model/tool-wire.ts once
// both slices are merged.
export type JsonSchemaLite = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchemaLite>;
  required?: string[];
  items?: JsonSchemaLite;
  enum?: (string | number | boolean)[];
  maxLength?: number;
  additionalProperties?: boolean;
};

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
