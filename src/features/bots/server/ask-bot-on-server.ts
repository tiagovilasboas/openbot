import type { DatabaseSync } from "node:sqlite";
import { modelNotAllowedResponse } from "../../model/allowed-models.ts";
import { answerChatRequest } from "../../model/answer-chat-request.ts";
import { parseChatRequest } from "../../model/parse-chat-request.ts";
import { providerOffResponse } from "../../model/provider-off-guard.ts";
import { readSettings } from "../../settings/server/settings-repository.ts";
import { buildBotSystemPrompt } from "../bot-system-prompt.ts";
import type { BotProfile } from "../bot-types.ts";
import type { Language } from "../../language/language.ts";
import { listBots } from "./bots-repository.ts";

export type ServerTurn = { role: "user" | "assistant"; text: string };

export type AskResult =
  { kind: "replied"; text: string } | { kind: "failed"; reason: string };

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Asks a bot on the server the way the chat would: its system prompt and
 * model, the saved model settings, keys from the vault, the allowed-model
 * and switched-off-provider checks, and failover. `extraRule` goes after the
 * bot's prompt, with room reserved so the request stays valid.
 */
export async function askBotOnServer(
  db: DatabaseSync,
  botId: string,
  messages: readonly ServerTurn[],
  env: Env = process.env,
  extraRule?: (language: Language) => string,
): Promise<AskResult> {
  const bot: BotProfile | undefined = listBots(db).find((b) => b.id === botId);
  if (!bot) return { kind: "failed", reason: "bot_missing" };
  const settings = readSettings(db);
  const language = settings.language ?? "pt";
  const rule = extraRule?.(language);
  const parsed = parseChatRequest({
    language,
    messages,
    ...(settings.modelConfig ? { config: settings.modelConfig } : {}),
    systemPrompt: rule
      ? `${buildBotSystemPrompt(bot, language, rule.length + 2)}\n\n${rule}`
      : buildBotSystemPrompt(bot, language),
    ...(bot.modelId ? { modelId: bot.modelId } : {}),
    ...(bot.backupModelIds?.length
      ? { backupModelIds: bot.backupModelIds }
      : {}),
  });
  if (!parsed.ok) return { kind: "failed", reason: "invalid_request" };
  if (modelNotAllowedResponse(env, parsed.request.modelId)) {
    return { kind: "failed", reason: "model_not_allowed" };
  }
  const offProviders = settings.providersOff ?? [];
  if (providerOffResponse(parsed.request, () => offProviders)) {
    return { kind: "failed", reason: "provider_off" };
  }
  const outcome = await answerChatRequest(parsed.request);
  const body = outcome.body as { text?: unknown; error?: unknown };
  if (outcome.status === 200 && typeof body.text === "string") {
    return { kind: "replied", text: body.text };
  }
  return {
    kind: "failed",
    reason: typeof body.error === "string" ? body.error : "unknown",
  };
}
