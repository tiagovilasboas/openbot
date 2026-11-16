import type { FailoverInfo, ModelRequest } from "../../model/model-adapter.ts";
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

async function* mapEvents(
  events: AsyncGenerator<ChatStreamEvent>,
  map: (event: ChatStreamEvent) => ChatStreamEvent,
): AsyncGenerator<ChatStreamEvent> {
  for await (const event of events) yield map(event);
}

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
 * Failover state of one turn. A step fails over only before it produced
 * anything, so a switch never repeats a tool call; calls only run after a
 * step has ended. Once a step moved to a backup model the next steps stay
 * there instead of asking the failed model again, and the first switch is
 * still reported on the final `done`.
 */
function failoverMemory(request: ModelRequest) {
  let model: string | undefined;
  let first: FailoverInfo | undefined;
  return {
    apply: (req: ModelRequest): ModelRequest =>
      model ? { ...req, modelId: model } : req,
    watch(event: ChatStreamEvent): ChatStreamEvent {
      if (event.type !== "done") return event;
      if (event.failover) {
        first ??= event.failover;
        // Only a backup id belongs to the primary provider; a configured
        // fallback has its own model and is asked again by each step.
        if (request.backupModelIds?.includes(event.failover.toModel)) {
          model = event.failover.toModel;
        }
        return event;
      }
      return first ? { ...event, failover: first } : event;
    },
  };
}

/**
 * One model step for the loop. With native tools it sends the specs and the
 * transcript; a 4xx on such a request is retried once as plain chat, and
 * from then on the whole turn stays plain, with earlier exchanges flattened.
 */
export function createToolStep(deps: StepDeps): StepFn {
  const { request, capability, onToolsUnavailable, ...base } = deps;
  const memory = failoverMemory(request);
  const stream = (req: ModelRequest) =>
    mapEvents(
      streamWithFailover({ ...base, request: memory.apply(req) }),
      memory.watch,
    );
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
      yield* stream(flattenTranscript(request, input.toolTranscript));
      return;
    }
    const events = stream({
      ...request,
      tools: input.tools,
      toolTranscript: input.toolTranscript,
    });
    const first = await events.next();
    if (!first.done && rejectsTools(first.value)) {
      await events.return(undefined);
      fallBack();
      yield* stream(flattenTranscript(request, input.toolTranscript));
      return;
    }
    if (first.done) return;
    yield first.value;
    yield* events;
  };
}
