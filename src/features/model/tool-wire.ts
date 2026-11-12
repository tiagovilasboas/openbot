/**
 * Neutral tool-calling types for the model domain. The tools domain maps its
 * own definitions onto these; the model domain never imports it.
 */

/** The JSON Schema subset a tool's parameters may use. */
export type JsonSchemaLite = {
  type: "object" | "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  properties?: Record<string, JsonSchemaLite>;
  items?: JsonSchemaLite;
  required?: string[];
  enum?: (string | number)[];
  maxLength?: number;
  additionalProperties?: boolean;
};

export type ToolSpec = {
  name: string;
  description: string;
  parameters: JsonSchemaLite;
};

/** Most characters of one tool call's arguments JSON. */
export const MAX_TOOL_ARGS_CHARS = 8 * 1024;

/**
 * One complete tool call from the model. `argsJson` is raw, untrusted text;
 * `argsError` marks a call whose arguments were over the cap (argsJson is then
 * empty), so the loop can report it back instead of running it.
 */
export type ToolCallChunk = {
  type: "tool_call";
  id: string;
  name: string;
  argsJson: string;
  argsError?: "too_long";
};

/** A finished call and what running it produced, replayed to the model. */
export type ToolExchange = {
  call: { id: string; name: string; argsJson: string };
  result: { ok: boolean; text: string };
};
