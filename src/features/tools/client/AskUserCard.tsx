"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Language } from "@/features/language/language.ts";
import { ASK_USER_LIMITS, type AskUserPrompt } from "../ask-user.ts";
import { askUserCopy } from "./ask-user-copy.ts";
import { expiryText } from "./approval-view.ts";
import type { PauseReply } from "./paused-turn.ts";

interface AskUserCardProps {
  callId: string;
  turnId: string;
  ask: AskUserPrompt;
  expiresAt: number;
  language: Language;
  onReply: (reply: PauseReply) => void;
}

const BUTTON =
  "min-h-11 rounded-full px-4 text-[15px] font-medium transition-[background-color,color,transform] duration-(--duration-micro) ease-out-expo active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:text-sm";
const OPTION = `${BUTTON} border border-border bg-background text-left text-foreground hover:bg-surface-secondary`;

/**
 * The bot's question, with its options as buttons and, when allowed, a text
 * field. Focus moves to the question when it appears so a screen reader
 * reads it; one answer (or a skip) resumes the turn, once.
 */
export function AskUserCard(props: AskUserCardProps) {
  const { callId, turnId, ask, expiresAt, language, onReply } = props;
  const copy = askUserCopy[language];
  const titleId = useId();
  const questionId = useId();
  const expiryId = useId();
  const fieldId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [answered, setAnswered] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    titleRef.current?.focus();
  }, [turnId]);

  const reply = (next: PauseReply) => {
    if (answered) return;
    setAnswered(true);
    onReply(next);
  };

  const submitText = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (value) reply({ callId, answer: { kind: "text", text: value } });
  };

  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={`${questionId} ${expiryId}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 animate-enter"
    >
      <h2
        id={titleId}
        ref={titleRef}
        tabIndex={-1}
        className="rounded-md text-[13px] font-medium text-muted"
      >
        {copy.title}
      </h2>
      <p
        id={questionId}
        className="break-words text-[15px] font-semibold text-foreground"
      >
        {ask.question}
      </p>
      <div
        role="group"
        aria-label={copy.optionsLabel}
        className="flex flex-wrap gap-2"
      >
        {ask.options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={answered}
            onClick={() => reply({ callId, answer: { kind: "option", index } })}
            className={OPTION}
          >
            {option}
          </button>
        ))}
      </div>
      {ask.allowFreeText && (
        <form onSubmit={submitText} className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="text-[13px] text-muted">
            {copy.freeTextLabel}
          </label>
          <div className="flex gap-2">
            <input
              id={fieldId}
              type="text"
              value={text}
              disabled={answered}
              maxLength={ASK_USER_LIMITS.answerMaxChars}
              placeholder={copy.freeTextPlaceholder}
              onChange={(event) => setText(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-[15px] text-foreground md:text-sm"
            />
            <button
              type="submit"
              disabled={answered || !text.trim()}
              className={`${BUTTON} bg-foreground font-semibold text-background`}
            >
              {copy.send}
            </button>
          </div>
        </form>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={expiryId} className="text-xs text-subtle">
          {expiryText(expiresAt, language)}
        </p>
        <button
          type="button"
          disabled={answered}
          onClick={() => reply("deny")}
          className={`${BUTTON} text-muted hover:bg-surface-secondary`}
        >
          {copy.skip}
        </button>
      </div>
    </section>
  );
}
