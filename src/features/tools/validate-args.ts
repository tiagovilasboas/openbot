import type {
  ToolCallRequest,
  ToolDefinition,
  ValidatedCall,
} from "./tool-definition.ts";

export const ARGS_JSON_MAX_BYTES = 8 * 1024;

// Resolves the tool and parses its arguments. Failures are typed results with
// fixed codes, never thrown and never carrying model-provided text.
export function validateCall(
  call: ToolCallRequest,
  tools: ReadonlyMap<string, ToolDefinition<unknown>>,
): ValidatedCall {
  const tool = tools.get(call.name);
  if (!tool) return { ok: false, code: "unknown_tool" };
  if (
    typeof call.argsJson !== "string" ||
    Buffer.byteLength(call.argsJson, "utf8") > ARGS_JSON_MAX_BYTES
  ) {
    return { ok: false, code: "bad_json" };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(call.argsJson === "" ? "{}" : call.argsJson);
  } catch {
    return { ok: false, code: "bad_json" };
  }
  try {
    const parsed = tool.parseArgs(raw);
    if (!parsed.ok) return { ok: false, code: "bad_args" };
    return { ok: true, tool, args: parsed.args };
  } catch {
    return { ok: false, code: "bad_args" };
  }
}
