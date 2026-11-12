import type { ModelFailureKind } from "../model/classify-model-failure.ts";
import type { ChatStreamEvent } from "../model/stream-events.ts";
import { parseJsonLine } from "../model/stream-lines.ts";
import { readTokenUsage } from "../model/token-usage.ts";
import {
  parseToolEvent,
  type ToolStreamEvent,
} from "../tools/client/tool-stream-events.ts";

/** The model's own text events, as the client reads them. */
export type ModelTextEvent = Extract<
  ChatStreamEvent,
  { type: "start" | "delta" | "done" | "error" }
>;

/** One event of a streamed turn: model text, or what the tools did. */
export type TurnEvent = ModelTextEvent | ToolStreamEvent;

const FAILURE_KINDS: readonly ModelFailureKind[] = [
  "auth",
  "rate_limit",
  "model_unavailable",
  "blocked_url",
  "unreachable",
  "offline",
  "timeout",
  "cancelled",
  "server",
  "response_too_long",
  "unknown",
];

function failureKind(code: unknown): ModelFailureKind {
  return FAILURE_KINDS.find((kind) => kind === code) ?? "unknown";
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * One NDJSON line from /api/chat/stream as a typed event. A line that is not
 * a known event is dropped (null), so a newer server never breaks this client.
 * The error code is narrowed to a known failure kind; anything else becomes
 * "unknown", and provider text is never read.
 */
export function parseStreamEvent(line: string): ModelTextEvent | null {
  const raw = parseJsonLine(line);
  return raw ? modelEvent(raw) : null;
}

/**
 * One NDJSON line of a streamed turn, from /api/chat/stream or the tool
 * route: the model events plus the checked tool events.
 */
export function parseTurnEvent(line: string): TurnEvent | null {
  const raw = parseJsonLine(line);
  if (!raw) return null;
  return modelEvent(raw) ?? parseToolEvent(raw);
}

function modelEvent(raw: Record<string, unknown>): ModelTextEvent | null {
  switch (raw.type) {
    case "start":
      return { type: "start", provider: text(raw.provider) ?? "" };
    case "delta":
      return typeof raw.text === "string"
        ? { type: "delta", text: raw.text }
        : null;
    case "done": {
      const failover = raw.failover as Record<string, unknown> | undefined;
      const fromModel = text(failover?.fromModel);
      const toModel = text(failover?.toModel);
      const reason = text(failover?.reason);
      const usage = readTokenUsage(raw.usage);
      return {
        type: "done",
        provider: text(raw.provider) ?? "",
        ...(usage ? { usage } : {}),
        ...(fromModel && toModel && reason
          ? { failover: { fromModel, toModel, reason } }
          : {}),
      };
    }
    case "error":
      return {
        type: "error",
        code: failureKind(raw.code),
        provider: text(raw.provider) ?? null,
        ...(typeof raw.status === "number" ? { status: raw.status } : {}),
      };
    default:
      return null;
  }
}
