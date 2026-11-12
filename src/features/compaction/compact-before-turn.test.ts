import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import type { ModelReplyOutcome } from "../chat/request-model-reply.ts";
import {
  compactBeforeTurn,
  type CompactBeforeTurnInput,
} from "./compact-before-turn.ts";
import { msg, thread } from "./thread-fixtures.ts";

/** Ten messages of 20k characters: over 75% of the 32k default window. */
function bigThread(): MessageData[] {
  return thread(5).map((m) =>
    msg(m.id, m.role, `${m.text} ${"w".repeat(20_000)}`),
  );
}

function harness(
  outcome: ModelReplyOutcome | Error,
  stored: MessageData[] = bigThread(),
) {
  let current = stored;
  const calls: unknown[][] = [];
  const usage: unknown[] = [];
  const input: CompactBeforeTurnInput = {
    readThread: () => current,
    userMessageId: 9,
    language: "en",
    model: undefined,
    systemPrompt: "",
    modelConfig: null,
    modelId: "bot-model",
    botId: "bot",
    persist: (next) => {
      current = next;
    },
    onUsage: (_bot, u) => usage.push(u),
    request: (async (...args: unknown[]) => {
      calls.push(args);
      if (outcome instanceof Error) throw outcome;
      return outcome;
    }) as CompactBeforeTurnInput["request"],
    now: () => new Date(0),
  };
  return {
    input,
    calls,
    usage,
    thread: () => current,
    replace: (next: MessageData[]) => {
      current = next;
    },
  };
}

test("a full window is compacted with the model's summary", async () => {
  const h = harness({
    kind: "text",
    text: "Decisions: X",
    usage: { inputTokens: 5, outputTokens: 2 },
  });
  assert.equal(await compactBeforeTurn(h.input), true);
  const next = h.thread();
  assert.equal(next[0].text, "Decisions: X");
  assert.equal(next[0].compacted?.archived.length, 2);
  assert.equal(next.length, 9);
  assert.equal(h.usage.length, 1);
  // The summary call uses the bot's own model and carries the old turns as data.
  const [, messages, , , , options] = h.calls[0] as [
    unknown,
    { text: string }[],
    unknown,
    unknown,
    unknown,
    { modelId: string },
  ];
  assert.equal(options.modelId, "bot-model");
  assert.ok(messages.some((m) => m.text.startsWith("<external-data>")));
});

test("a roomy thread is left alone and the model is not asked", async () => {
  const h = harness({ kind: "text", text: "unused" }, thread(5));
  assert.equal(await compactBeforeTurn(h.input), false);
  assert.equal(h.calls.length, 0);
});

test("a failed summary leaves the thread exactly as it was", async () => {
  const stored = bigThread();
  for (const outcome of [
    {
      kind: "error",
      failure: { kind: "timeout" },
    } as unknown as ModelReplyOutcome,
    { kind: "unavailable" } as ModelReplyOutcome,
    new Error("network"),
  ]) {
    const h = harness(outcome, stored);
    assert.equal(await compactBeforeTurn(h.input), false);
    assert.equal(h.thread(), stored);
  }
});

test("an empty summary does not compact", async () => {
  const stored = bigThread();
  const h = harness({ kind: "text", text: "   " }, stored);
  assert.equal(await compactBeforeTurn(h.input), false);
  assert.equal(h.thread(), stored);
});

test("a thread that changed while the summary ran is not overwritten", async () => {
  const h = harness({ kind: "text", text: "summary" });
  const request = h.input.request!;
  h.input.request = (async (...args: Parameters<typeof request>) => {
    h.replace([]);
    return request(...args);
  }) as typeof request;
  assert.equal(await compactBeforeTurn(h.input), false);
  assert.deepEqual(h.thread(), []);
});

test("a cancel during the summary stores nothing", async () => {
  const controller = new AbortController();
  const stored = bigThread();
  const h = harness({ kind: "text", text: "summary" }, stored);
  const request = h.input.request!;
  h.input.signal = controller.signal;
  h.input.request = (async (...args: Parameters<typeof request>) => {
    controller.abort();
    return request(...args);
  }) as typeof request;
  assert.equal(await compactBeforeTurn(h.input), false);
  assert.equal(h.thread(), stored);
});
