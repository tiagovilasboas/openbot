import { asRecord } from "./stream-lines.ts";
import { MAX_TOOL_ARGS_CHARS, type ToolCallChunk } from "./tool-wire.ts";

/** Parallel calls one step may stream; higher indexes are dropped. */
const MAX_CALL_INDEX = 7;
const MAX_ID_CHARS = 64;
const NAME_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

type Pending = {
  id?: string;
  name?: string;
  args: string;
  overflow: boolean;
};

/**
 * Collects OpenAI `delta.tool_calls` fragments, which arrive split across
 * chunks and keyed by `index`, into complete calls. Everything here is
 * untrusted model output: bad shapes are skipped, never thrown on.
 */
export function createToolCallAssembler() {
  const pending = new Map<number, Pending>();

  function add(fragments: unknown): void {
    if (!Array.isArray(fragments)) return;
    for (const raw of fragments) {
      const fragment = asRecord(raw);
      const index = fragment?.index;
      if (
        !fragment ||
        typeof index !== "number" ||
        !Number.isInteger(index) ||
        index < 0 ||
        index > MAX_CALL_INDEX
      ) {
        continue;
      }
      const call = pending.get(index) ?? { args: "", overflow: false };
      pending.set(index, call);
      if (typeof fragment.id === "string" && !call.id) call.id = fragment.id;
      const fn = asRecord(fragment.function);
      if (typeof fn?.name === "string" && !call.name) call.name = fn.name;
      if (typeof fn?.arguments === "string" && !call.overflow) {
        call.args += fn.arguments;
        if (call.args.length > MAX_TOOL_ARGS_CHARS) {
          call.overflow = true;
          call.args = "";
        }
      }
    }
  }

  /** The finished calls in index order; the assembler is empty afterwards. */
  function* flush(): Generator<ToolCallChunk> {
    const indexes = [...pending.keys()].sort((a, b) => a - b);
    for (const index of indexes) {
      const call = pending.get(index)!;
      if (!call.name || !NAME_PATTERN.test(call.name)) continue;
      const id =
        call.id && call.id.length <= MAX_ID_CHARS ? call.id : `call_${index}`;
      yield {
        type: "tool_call",
        id,
        name: call.name,
        argsJson: call.args,
        ...(call.overflow ? { argsError: "too_long" as const } : {}),
      };
    }
    pending.clear();
  }

  return { add, flush };
}
