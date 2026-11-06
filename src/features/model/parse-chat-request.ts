import type { ModelMessage, ModelRequest } from "./model-adapter.ts";

const maxMessages = 50;
const maxTextLength = 4000;

export type ParsedChatRequest =
  { ok: true; request: ModelRequest } | { ok: false };

function isMessage(value: unknown): value is ModelMessage {
  if (typeof value !== "object" || value === null) return false;
  const { role, text } = value as Record<string, unknown>;
  return (
    (role === "user" || role === "assistant") &&
    typeof text === "string" &&
    text.trim().length > 0 &&
    text.length <= maxTextLength
  );
}

export function parseChatRequest(payload: unknown): ParsedChatRequest {
  if (typeof payload !== "object" || payload === null) return { ok: false };
  const { language, messages } = payload as Record<string, unknown>;
  if (language !== "pt" && language !== "en") return { ok: false };
  if (!Array.isArray(messages)) return { ok: false };
  if (messages.length === 0 || messages.length > maxMessages) {
    return { ok: false };
  }
  if (!messages.every(isMessage)) return { ok: false };
  if (messages[messages.length - 1].role !== "user") return { ok: false };
  return { ok: true, request: { language, messages } };
}
