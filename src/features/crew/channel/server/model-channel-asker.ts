import type { DatabaseSync } from "node:sqlite";
import { modelNotAllowedResponse } from "../../../model/allowed-models.ts";
import {
  answerChatRequest,
  type ChatRequest,
} from "../../../model/answer-chat-request.ts";
import { parseChatRequest } from "../../../model/parse-chat-request.ts";
import { providerOffResponse } from "../../../model/provider-off-guard.ts";
import { readSettings } from "../../../settings/server/settings-repository.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";

/**
 * The crew turn's model call, run on the server the way a routine runs: the
 * saved model settings, keys from the vault, the allowed-model and
 * switched-off-provider checks, and failover to the speaker's backups.
 */
export function buildChannelRequest(
  db: DatabaseSync,
  env: Readonly<Record<string, string | undefined>>,
  call: Parameters<AskCrewModel>[0],
): ChatRequest | null {
  const { systemPrompt, messages, modelId, speaker } = call;
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
  if (!parsed.ok) return null;
  if (modelNotAllowedResponse(env, parsed.request.modelId)) return null;
  const offProviders = settings.providersOff ?? [];
  if (providerOffResponse(parsed.request, () => offProviders)) return null;
  return parsed.request;
}

export function createModelChannelAsker(
  db: DatabaseSync,
  env: Readonly<Record<string, string | undefined>> = process.env,
): AskCrewModel {
  return async (call) => {
    const request = buildChannelRequest(db, env, call);
    if (!request) return { ok: false };
    const outcome = await answerChatRequest(request);
    const body = outcome.body as { text?: unknown };
    return outcome.status === 200 && typeof body.text === "string"
      ? { ok: true, text: body.text }
      : { ok: false };
  };
}
