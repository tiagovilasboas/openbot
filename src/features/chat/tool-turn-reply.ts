import type { AttachmentPayload } from "../attachments/parse-attachments.ts";
import type { ModelFailure } from "../model/classify-model-failure.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import type { ModelCallResult } from "../model/model-status.ts";
import type { TokenUsage } from "../model/token-usage.ts";
import {
  expirePending,
  markPending,
  toStoredSteps,
  type LiveToolStep,
} from "../tools/client/live-tool-steps.ts";
import { joinReplyText, type PausedTurn } from "../tools/client/paused-turn.ts";
import type { ToolTurnRequest } from "../tools/client/tool-route.ts";
import type { ToolStep } from "../tools/client/tool-steps.ts";
import { createToolTurnLog } from "../tools/client/tool-turn-log.ts";
import { toolsCopy } from "../tools/client/tools-copy.ts";
import { describeModelFailure } from "./describe-model-failure.ts";
import { incompleteKindOf, type IncompleteKind } from "./incomplete-reply.ts";
import type { FailoverDetail, HistoryMessage } from "./request-model-reply.ts";
import {
  requestModelStream,
  type ModelStreamOptions,
  type ModelStreamOutcome,
} from "./request-model-stream.ts";
import {
  getUnconfiguredModelMessage,
  type ChatLanguage,
} from "./respond-to-message.ts";

/** Everything a streamed turn sends; a resume re-sends it unchanged. */
export type StreamRequest = {
  language: ChatLanguage;
  messages: HistoryMessage[];
  config: ClientModelConfig | null;
  systemPrompt: string;
  modelId?: string;
  memory?: string[];
  attachments?: AttachmentPayload[];
};

/** A paused tool turn before the thread gave its message an id. */
export type ToolPauseDraft = Omit<PausedTurn<StreamRequest>, "messageId">;

/** A tool turn's reply, in the shape of the chat reply outcome. */
export type ToolTurnReply = {
  text: string;
  failover?: FailoverDetail;
  incomplete?: IncompleteKind;
  modelCall?: ModelCallResult;
  toolSteps?: ToolStep[];
  toolsUnavailable?: true;
  toolPause?: ToolPauseDraft;
};

export type ToolTurnResult = {
  reply: ToolTurnReply;
  /** The model answered at all, so the usage log counts the reply. */
  produced: boolean;
  usage?: TokenUsage;
};

export function sendStreamRequest(
  request: StreamRequest,
  options: Omit<ModelStreamOptions, "modelId" | "memory" | "attachments">,
  fetchImpl: typeof fetch = fetch,
): Promise<ModelStreamOutcome> {
  const { language, messages, config, systemPrompt, ...rest } = request;
  return requestModelStream(
    language,
    messages,
    fetchImpl,
    config,
    systemPrompt,
    { ...options, ...rest },
  );
}

const stepsField = (steps: LiveToolStep[]) =>
  steps.length > 0 ? { toolSteps: toStoredSteps(steps) } : {};

/**
 * A paused turn that can no longer be resumed (expired, refused, or dropped
 * for a new message): the text so far stays and its waiting calls expire.
 */
export function expiredToolReply(
  turn: { text: string; steps: readonly LiveToolStep[] },
  language: ChatLanguage,
): ToolTurnReply {
  return {
    text: turn.text || toolsCopy[language].expiredNote,
    ...stepsField(expirePending(turn.steps)),
  };
}

const failedCall = (failure: ModelFailure) =>
  failure.kind === "cancelled" ? {} : { modelCall: "failed" as const };

/**
 * Streams one tool turn (a first message or a resume) and shapes what came
 * back as a reply. A resume continues the text and the steps before the
 * pause; a refused resume leaves the turn readable, its waiting calls expired.
 */
export async function streamToolTurn(input: {
  request: StreamRequest;
  tools: ToolTurnRequest;
  prior?: { text: string; steps: LiveToolStep[] };
  signal?: AbortSignal;
  show?: (text: string) => void;
  onMemoryChanged: (botId: string) => void;
  onToolSteps?: (steps: LiveToolStep[]) => void;
  fetchImpl?: typeof fetch;
}): Promise<ToolTurnResult> {
  const { request, tools, prior, show } = input;
  const before = prior?.text ?? "";
  const log = createToolTurnLog({
    botId: tools.botId,
    initial: prior?.steps,
    onMemoryChanged: input.onMemoryChanged,
    onSteps: input.onToolSteps,
  });
  const outcome = await sendStreamRequest(
    request,
    {
      signal: input.signal,
      tools,
      onToolEvent: log.hear,
      ...(show ? { onText: (text) => show(joinReplyText(before, text)) } : {}),
    },
    input.fetchImpl,
  );
  const notice = log.unavailable() ? { toolsUnavailable: true as const } : {};
  const steps = log.steps();
  const language = request.language;

  switch (outcome.kind) {
    case "approval": {
      const text = joinReplyText(before, outcome.text);
      const waiting = markPending(steps, outcome.pause.calls);
      return {
        produced: true,
        reply: {
          // Stored as a reload would find it: the pause cannot outlive the page.
          text: text || toolsCopy[language].expiredNote,
          modelCall: "ok",
          ...stepsField(waiting),
          ...notice,
          toolPause: {
            botId: tools.botId,
            pause: outcome.pause,
            request,
            text,
            steps: waiting,
          },
        },
      };
    }
    case "text":
      return {
        produced: true,
        usage: outcome.usage,
        reply: {
          text: joinReplyText(before, outcome.text),
          modelCall: "ok",
          ...(outcome.failover ? { failover: outcome.failover } : {}),
          ...stepsField(steps),
          ...notice,
        },
      };
    case "partial":
      return {
        produced: true,
        reply: {
          text: joinReplyText(before, outcome.text),
          incomplete: incompleteKindOf(outcome.failure),
          ...failedCall(outcome.failure),
          ...stepsField(steps),
          ...notice,
        },
      };
    case "resume_refused":
      return {
        produced: false,
        reply: expiredToolReply({ text: before, steps }, language),
      };
    case "unavailable":
      return {
        produced: false,
        reply: { text: getUnconfiguredModelMessage(language) },
      };
    case "error":
      return {
        produced: false,
        reply: {
          ...(before
            ? { text: before, incomplete: incompleteKindOf(outcome.failure) }
            : { text: describeModelFailure(outcome.failure, language) }),
          ...failedCall(outcome.failure),
          ...stepsField(steps),
          ...notice,
        },
      };
  }
}
