import assert from "node:assert/strict";
import test from "node:test";
import type { ToolDefinition } from "./tool-definition.ts";
import { ARGS_JSON_MAX_BYTES, validateCall } from "./validate-args.ts";

const echo: ToolDefinition<{ text: string }> = {
  name: "echo",
  description: "echo",
  parameters: { type: "object" },
  policy: "auto",
  allowAlways: false,
  timeoutMs: 1000,
  maxResultChars: 100,
  parseArgs(raw) {
    const text = (raw as { text?: unknown } | null)?.text;
    return typeof text === "string"
      ? { ok: true, args: { text } }
      : { ok: false };
  },
  run: async (args) => ({ ok: true, text: args.text }),
};
const throwing: ToolDefinition<unknown> = {
  ...echo,
  name: "boom",
  parseArgs() {
    throw new Error("secret detail");
  },
} as ToolDefinition<unknown>;
const tools = new Map<string, ToolDefinition<unknown>>([
  ["echo", echo as ToolDefinition<unknown>],
  ["boom", throwing],
]);
const call = (name: string, argsJson: string) => ({ id: "c1", name, argsJson });

test("valid call returns the tool and parsed args", () => {
  const result = validateCall(call("echo", '{"text":"hi"}'), tools);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.args, { text: "hi" });
});

test("empty argsJson is treated as an empty object", () => {
  assert.deepEqual(validateCall(call("echo", ""), tools), {
    ok: false,
    code: "bad_args",
  });
});

test("unknown tool, including prototype names, is a typed error", () => {
  for (const name of ["nope", "constructor", "__proto__", "toString"]) {
    assert.deepEqual(validateCall(call(name, "{}"), tools), {
      ok: false,
      code: "unknown_tool",
    });
  }
});

test("malformed JSON is bad_json", () => {
  assert.deepEqual(validateCall(call("echo", "{not json"), tools), {
    ok: false,
    code: "bad_json",
  });
});

test("oversized arguments are rejected before parsing", () => {
  const big = JSON.stringify({ text: "x".repeat(ARGS_JSON_MAX_BYTES) });
  assert.deepEqual(validateCall(call("echo", big), tools), {
    ok: false,
    code: "bad_json",
  });
});

test("invalid args and a throwing parseArgs are bad_args, never thrown", () => {
  assert.deepEqual(validateCall(call("echo", '{"text":1}'), tools), {
    ok: false,
    code: "bad_args",
  });
  assert.deepEqual(validateCall(call("boom", "{}"), tools), {
    ok: false,
    code: "bad_args",
  });
});
