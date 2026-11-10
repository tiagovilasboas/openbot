"use client";

import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import type { SkillDraft } from "./parse-suggestion-reply.ts";
import { getSuggestionCopy, type SuggestionCopy } from "./suggestion-copy.ts";
import { useSkillSuggestion } from "./use-skill-suggestion.ts";

export interface SkillSuggestionPanelProps {
  botId: string;
  language: ChatLanguage;
  /** The model picked in the sheet, if the bot has its own. */
  modelId?: string;
  /** Called only when the person clicks accept. */
  onAccept: (draft: SkillDraft) => void;
}

const QUIET_BUTTON =
  "min-h-11 rounded-full px-4 text-[15px] font-medium text-muted transition-colors hover:text-foreground active:scale-[0.97] md:text-sm";
const SOLID_BUTTON =
  "min-h-11 rounded-full border border-border bg-surface px-5 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm";

function DraftCard({
  draft,
  copy: c,
  onAccept,
  onDiscard,
}: {
  draft: SkillDraft;
  copy: SuggestionCopy;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="group"
      aria-labelledby="skill-suggestion-title"
      className="flex flex-col gap-3 rounded-2xl border border-border p-4"
    >
      <div className="flex flex-col gap-1">
        <h4
          id="skill-suggestion-title"
          className="text-[15px] font-semibold text-foreground md:text-sm"
        >
          {c.draftTitle}
        </h4>
        <p className="text-[13px] text-muted">{c.draftWarning}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline gap-2">
          <span className="text-[15px] font-medium text-foreground md:text-sm">
            {draft.name}
          </span>
          <span className="font-mono text-[13px] text-subtle">
            {draft.command}
          </span>
        </p>
        {draft.description && (
          <p className="text-[13px] text-muted">{draft.description}</p>
        )}
      </div>
      <div>
        <p className="text-[13px] font-medium text-subtle">
          {c.instructionsLabel}
        </p>
        <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-surface px-3.5 py-2.5 text-[13px] text-foreground">
          {draft.instructions}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDiscard} className={QUIET_BUTTON}>
          {c.discard}
        </button>
        <button type="button" onClick={onAccept} className={SOLID_BUTTON}>
          {c.accept}
        </button>
      </div>
    </div>
  );
}

/**
 * "Suggest a skill from this bot's chats": idle, thinking, a draft to accept
 * or discard, or an error. Nothing reaches the bot's skills until accept.
 */
export function SkillSuggestionPanel({
  botId,
  language,
  modelId,
  onAccept,
}: SkillSuggestionPanelProps) {
  const c = getSuggestionCopy(language);
  const { state, suggest, cancel, reset } = useSkillSuggestion(
    botId,
    language,
    modelId,
  );

  if (state.status === "draft") {
    return (
      <DraftCard
        draft={state.draft}
        copy={c}
        onAccept={() => {
          onAccept(state.draft);
          reset();
        }}
        onDiscard={reset}
      />
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {state.status === "thinking" ? (
        <div className="flex items-center gap-3">
          <p role="status" className="text-[13px] text-muted">
            {c.thinking}
          </p>
          <button type="button" onClick={cancel} className={QUIET_BUTTON}>
            {c.cancel}
          </button>
        </div>
      ) : (
        <>
          <button type="button" onClick={suggest} className={SOLID_BUTTON}>
            {state.status === "error" ? c.retry : c.action}
          </button>
          {state.status === "error" ? (
            <p role="alert" className="text-[13px] text-danger">
              {state.message}
            </p>
          ) : (
            <p className="text-[13px] text-subtle">{c.hint}</p>
          )}
        </>
      )}
    </div>
  );
}
