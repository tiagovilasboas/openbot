"use client";

import { useRef, useState } from "react";
import type { BotProfile } from "../bots/bot-types.ts";
import { buildBotSystemPrompt } from "../bots/bot-system-prompt.ts";
import { requestModelReply } from "../chat/request-model-reply.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { loadBotMessages } from "../chat/use-bot-messages.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import {
  SIDE_QUESTION_MAX_CHARS,
  sideQuestionMessages,
} from "./side-question.ts";
import { getSideQuestionCopy } from "./side-question-copy.ts";

interface SideQuestionPanelProps {
  language: ChatLanguage;
  bot: BotProfile;
  threadId: string;
  modelConfig: ClientModelConfig | null;
  isConfigured: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "answer"; text: string }
  | { kind: "failed" };

/** Asks the bot about its recent messages; the thread is never written. */
export function SideQuestionPanel({
  language,
  bot,
  threadId,
  modelConfig,
  isConfigured,
}: SideQuestionPanelProps) {
  const copy = getSideQuestionCopy(language);
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  function close() {
    abortRef.current?.abort();
    setIsOpen(false);
    setState({ kind: "idle" });
  }

  async function ask() {
    const messages = sideQuestionMessages(
      loadBotMessages(bot.id, threadId),
      question,
    );
    if (!messages) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "asking" });
    const outcome = await requestModelReply(
      language,
      messages,
      fetch,
      modelConfig,
      buildBotSystemPrompt(bot, language),
      {
        signal: controller.signal,
        modelId: bot.modelId,
        backupModelIds: bot.backupModelIds,
      },
    );
    if (controller.signal.aborted) return;
    setState(
      outcome.kind === "text"
        ? { kind: "answer", text: outcome.text }
        : { kind: "failed" },
    );
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground md:h-auto md:min-h-11"
      >
        {copy.open}
      </button>
      <ResponsiveSheet
        isOpen={isOpen}
        onClose={close}
        title={copy.title}
        description={copy.description}
        size="md"
        closeLabel={copy.close}
      >
        {!isConfigured ? (
          <p className="text-[13px] text-muted">{copy.noModel}</p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask();
            }}
          >
            <label className="flex flex-col gap-1 text-[13px] font-medium text-foreground">
              {copy.label}
              <textarea
                value={question}
                maxLength={SIDE_QUESTION_MAX_CHARS}
                rows={3}
                placeholder={copy.placeholder}
                onChange={(event) => setQuestion(event.target.value)}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-[15px] font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={!question.trim() || state.kind === "asking"}
              className="min-h-11 self-end rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
            >
              {state.kind === "asking" ? copy.asking : copy.ask}
            </button>
            <div aria-live="polite">
              {state.kind === "answer" && (
                <p className="whitespace-pre-wrap rounded-xl bg-surface px-3 py-2 text-[15px] text-foreground">
                  {state.text}
                </p>
              )}
              {state.kind === "failed" && (
                <p className="text-[13px] text-danger">{copy.failed}</p>
              )}
            </div>
          </form>
        )}
      </ResponsiveSheet>
    </>
  );
}
