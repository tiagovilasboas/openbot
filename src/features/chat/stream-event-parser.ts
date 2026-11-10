import type { ModelFailureKind } from "../model/classify-model-failure.ts";
import type { ChatStreamEvent } from "../model/stream-events.ts";
import { parseJsonLine } from "../model/stream-lines.ts";
import { readTokenUsage } from "../model/token-usage.ts";

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
export function parseStreamEvent(line: string): ChatStreamEvent | null {
  const raw = parseJsonLine(line);
  if (!raw) return null;
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
