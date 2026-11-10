import type { ModelMessage, ModelRequest } from "./model-adapter.ts";
import { appendMemoryBlock } from "../memory/memory-block.ts";
import { validateClientModelConfig } from "./model-config.ts";
import { parseModelId } from "./model-id.ts";

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
    text.trim().length > 0
  );
}

/**
 * A long earlier reply must not break every later turn, so each message is
 * cut to the limit instead of rejecting the whole conversation.
 */
function clampMessage(message: ModelMessage): ModelMessage {
  return message.text.length <= maxTextLength
    ? message
    : { role: message.role, text: message.text.slice(0, maxTextLength) };
}

export function parseChatRequest(payload: unknown): ParsedChatRequest {
  if (typeof payload !== "object" || payload === null) return { ok: false };
  const {
    language,
    messages,
    config,
    fallbackConfig,
    systemPrompt,
    modelId,
    memory,
  } = payload as Record<string, unknown>;
  if (language !== "pt" && language !== "en") return { ok: false };
  if (!Array.isArray(messages)) return { ok: false };
  if (messages.length === 0 || messages.length > maxMessages) {
    return { ok: false };
  }
  if (!messages.every(isMessage)) return { ok: false };
  if (memory !== undefined && !Array.isArray(memory)) return { ok: false };
  if (messages[messages.length - 1].role !== "user") return { ok: false };

  let validatedConfig: ModelRequest["config"];
  if (config !== undefined) {
    const parsed = validateClientModelConfig(config);
    if (!parsed) return { ok: false };
    validatedConfig = parsed;
  }

  let validatedFallbackConfig: ModelRequest["fallbackConfig"];
  if (fallbackConfig !== undefined) {
    const parsed = validateClientModelConfig(fallbackConfig);
    if (parsed) {
      validatedFallbackConfig = parsed;
    }
  }

  const parsedModelId = parseModelId(modelId);
  if (!parsedModelId.ok) return { ok: false };

  const validSystemPrompt =
    typeof systemPrompt === "string" && systemPrompt.trim()
      ? systemPrompt.trim().slice(0, maxTextLength)
      : undefined;
  // The memory notes are capped and delimited as data here, whatever the
  // client sent, so there is one implementation of the block.
  const fullSystemPrompt = appendMemoryBlock(
    validSystemPrompt,
    memory,
    language,
  );

  return {
    ok: true,
    request: {
      language,
      messages: messages.map(clampMessage),
      ...(validatedConfig ? { config: validatedConfig } : {}),
      ...(validatedFallbackConfig
        ? { fallbackConfig: validatedFallbackConfig }
        : {}),
      ...(fullSystemPrompt ? { systemPrompt: fullSystemPrompt } : {}),
      ...(parsedModelId.modelId ? { modelId: parsedModelId.modelId } : {}),
    },
  };
}
