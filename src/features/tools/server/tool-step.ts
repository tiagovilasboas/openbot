import type { ModelRequest } from "../../model/model-adapter.ts";
import type { ChatStreamEvent } from "../../model/stream-events.ts";
import {
  streamWithFailover,
  type StreamWithFailoverOptions,
} from "../../model/stream-with-failover.ts";
import type { ToolCapability } from "../../model/tool-capability.ts";
import type { ToolExchange } from "../../model/tool-wire.ts";
import type { StepFn } from "../tool-loop-types.ts";

type StepDeps = Omit<StreamWithFailoverOptions, "request"> & {
  request: ModelRequest;
  capability: ToolCapability;
  /** Called once, the first time the turn falls back to plain chat. */
  onToolsUnavailable: () => void;
};

/** Auth and rate limits say nothing about tool support; other 4xx might. */
function rejectsTools(event: ChatStreamEvent): boolean {
  if (event.type !== "error" || event.status === undefined) return false;
  const { status } = event;
  return (
    status >= 400 &&
    status < 500 &&
    status !== 401 &&
    status !== 403 &&
    status !== 429
  );
}

/**
 * Earlier exchanges as plain text in the system prompt, for a model that
 * takes no tools. The results are already wrapped as external data.
 */
export function flattenTranscript(
  request: ModelRequest,
  transcript: readonly ToolExchange[],
): ModelRequest {
  const plain: ModelRequest = { ...request };
  delete plain.tools;
  delete plain.toolTranscript;
  if (transcript.length === 0) return plain;
  const lines = transcript.map(
    ({ call, result }) =>
      `- ${call.name} (${result.ok ? "ok" : "failed"}): ${result.text}`,
  );
  const block = `Tool results from earlier in this turn:\n${lines.join("\n")}`;
  return {
    ...plain,
    systemPrompt: plain.systemPrompt
      ? `${plain.systemPrompt}\n\n${block}`
      : block,
  };
}

/**
 * One model step for the loop. With native tools it sends the specs and the
 * transcript; a 4xx on such a request is retried once as plain chat, and
 * from then on the whole turn stays plain, with earlier exchanges flattened.
 */
export function createToolStep(deps: StepDeps): StepFn {
  const { request, capability, onToolsUnavailable, ...stream } = deps;
  let toolsOk = capability === "native";
  let announced = false;
  const fallBack = () => {
    toolsOk = false;
    if (!announced) onToolsUnavailable();
    announced = true;
  };
  if (!toolsOk) fallBack();

  return async function* step(input) {
    if (!toolsOk || !input.tools) {
      yield* streamWithFailover({
        ...stream,
        request: flattenTranscript(request, input.toolTranscript),
      });
      return;
    }
    const events = streamWithFailover({
      ...stream,
      request: {
        ...request,
        tools: input.tools,
        toolTranscript: input.toolTranscript,
      },
    });
    const first = await events.next();
    if (!first.done && rejectsTools(first.value)) {
      await events.return(undefined);
      fallBack();
      yield* streamWithFailover({
        ...stream,
        request: flattenTranscript(request, input.toolTranscript),
      });
      return;
    }
    if (first.done) return;
    yield first.value;
    yield* events;
  };
}
