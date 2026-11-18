import type { DatabaseSync } from "node:sqlite";
import { buildBotSystemPrompt } from "../../bots/bot-system-prompt.ts";
import { listBots } from "../../bots/server/bots-repository.ts";
import { modelNotAllowedResponse } from "../../model/allowed-models.ts";
import { answerChatRequest } from "../../model/answer-chat-request.ts";
import { parseChatRequest } from "../../model/parse-chat-request.ts";
import { providerOffResponse } from "../../model/provider-off-guard.ts";
import { readSettings } from "../../settings/server/settings-repository.ts";
import { routinePrompt } from "../silent-run.ts";
import type { RoutineRunner } from "./run-routines.ts";

/**
 * Runs a routine the way the chat would, on the server: the bot's system
 * prompt and model, the saved model settings, keys from the vault, the same
 * allowed-model and switched-off-provider checks, and failover.
 */
export function createModelRoutineRunner(
  db: DatabaseSync,
  env: Readonly<Record<string, string | undefined>> = process.env,
): RoutineRunner {
  return async (routine) => {
    const bot = listBots(db).find(
      (candidate) => candidate.id === routine.botId,
    );
    if (!bot) return { kind: "failed", reason: "bot_missing" };
    const settings = readSettings(db);
    const language = settings.language ?? "pt";
    const parsed = parseChatRequest({
      language,
      messages: [
        {
          role: "user",
          text: routinePrompt(
            routine.prompt,
            routine.silentWhenNothingNew,
            language,
          ),
        },
      ],
      ...(settings.modelConfig ? { config: settings.modelConfig } : {}),
      systemPrompt: buildBotSystemPrompt(bot, language),
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
  };
}
