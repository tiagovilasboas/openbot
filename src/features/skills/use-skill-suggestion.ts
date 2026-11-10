"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadBotMessages } from "@/features/chat/use-bot-messages.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { useModelConfig } from "@/features/model/use-model-config.ts";
import { describeSuggestionFailure } from "./describe-suggestion-failure.ts";
import type { SkillDraft } from "./parse-suggestion-reply.ts";
import { requestSkillSuggestion } from "./request-skill-suggestion.ts";
import { SUGGEST_MIN_MESSAGES, userMessagesOf } from "./suggestion-history.ts";

export type SuggestionState =
  | { status: "idle" }
  | { status: "thinking" }
  | { status: "draft"; draft: SkillDraft }
  | { status: "error"; message: string };

/**
 * One bot's skill suggestion: read its recent user messages on this device,
 * ask the server once, and hold the draft until the person accepts or
 * discards it. The hook never adds a skill itself.
 */
export function useSkillSuggestion(
  botId: string,
  language: ChatLanguage,
  modelId?: string,
) {
  const config = useModelConfig();
  const [state, setState] = useState<SuggestionState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  // Leaving the sheet ends a call still in flight.
  useEffect(() => () => controller.current?.abort(), []);

  const suggest = useCallback(async () => {
    const messages = userMessagesOf(loadBotMessages(botId));
    if (messages.length < SUGGEST_MIN_MESSAGES) {
      setState({
        status: "error",
        message: describeSuggestionFailure(
          { kind: "not_enough_history" },
          language,
        ),
      });
      return;
    }
    const mine = new AbortController();
    controller.current = mine;
    setState({ status: "thinking" });
    const outcome = await requestSkillSuggestion(language, messages, fetch, {
      config,
      modelId,
      signal: mine.signal,
    });
    if (controller.current !== mine) return;
    controller.current = null;
    if (outcome.kind === "error" && outcome.failure.kind === "cancelled") {
      setState({ status: "idle" });
    } else if (outcome.kind === "draft") {
      setState({ status: "draft", draft: outcome.draft });
    } else {
      setState({
        status: "error",
        message: describeSuggestionFailure(outcome, language),
      });
    }
  }, [botId, config, language, modelId]);

  const cancel = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, suggest, cancel, reset };
}
