import type { DatabaseSync } from "node:sqlite";
import { modelNotAllowedResponse } from "../../../model/allowed-models.ts";
import { answerChatRequest } from "../../../model/answer-chat-request.ts";
import { parseChatRequest } from "../../../model/parse-chat-request.ts";
import { providerOffResponse } from "../../../model/provider-off-guard.ts";
import { readSettings } from "../../../settings/server/settings-repository.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";

/**
 * The crew turn's model call, run on the server the way a routine runs: the
 * saved model settings, keys from the vault, the allowed-model and
 * switched-off-provider checks, and failover to the speaker's backups.
 */
export function createModelChannelAsker(
  db: DatabaseSync,
  env: Readonly<Record<string, string | undefined>> = process.env,
): AskCrewModel {
  return async ({ systemPrompt, messages, modelId, speaker }) => {
    const settings = readSettings(db);
    const parsed = parseChatRequest({
      language: settings.language ?? "pt",
      messages,
      ...(settings.modelConfig ? { config: settings.modelConfig } : {}),
      systemPrompt,
      ...(modelId ? { modelId } : {}),
      ...(speaker?.backupModelIds?.length
        ? { backupModelIds: speaker.backupModelIds }
        : {}),
    });
    if (!parsed.ok) return { ok: false };
    if (modelNotAllowedResponse(env, parsed.request.modelId)) {
      return { ok: false };
    }
    const offProviders = settings.providersOff ?? [];
    if (providerOffResponse(parsed.request, () => offProviders)) {
      return { ok: false };
    }
    const outcome = await answerChatRequest(parsed.request);
    const body = outcome.body as { text?: unknown };
    return outcome.status === 200 && typeof body.text === "string"
      ? { ok: true, text: body.text }
      : { ok: false };
  };
}
