"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Language } from "@/features/language/language.ts";
import { expiryText, offersAlways } from "./approval-view.ts";
import type { DecisionChoice } from "./paused-turn.ts";
import type { ApprovalPause } from "./tool-stream-events.ts";
import { toolLabel, toolsCopy } from "./tools-copy.ts";

interface ApprovalCardProps {
  pause: ApprovalPause;
  language: Language;
  onDecide: (choice: DecisionChoice) => void;
}

const BUTTON =
  "min-h-11 rounded-full px-4 text-[15px] font-medium transition-[background-color,color,transform] duration-(--duration-micro) ease-out-expo active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:text-sm";

/**
 * Asks the user before the bot runs a tool that changes something. Focus
 * moves to the card when it appears, so a screen reader reads the request;
 * each choice answers every waiting call at once.
 */
export function ApprovalCard({ pause, language, onDecide }: ApprovalCardProps) {
  const copy = toolsCopy[language];
  const titleId = useId();
  const expiryId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
  }, [pause.turnId]);

  const decide = (choice: DecisionChoice) => {
    if (answered) return;
    setAnswered(true);
    onDecide(choice);
  };

  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={expiryId}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 animate-enter"
    >
      <h2
        id={titleId}
        ref={titleRef}
        tabIndex={-1}
        className="rounded-md text-[15px] font-semibold text-foreground"
      >
        {copy.approvalTitle}
      </h2>
      <ul className="flex flex-col gap-2">
        {pause.calls.map((call) => (
          <li key={call.callId} className="flex min-w-0 flex-col gap-1">
            <span className="text-[14px] font-medium text-foreground">
              {toolLabel(call.name, language)}
            </span>
            {call.preview && (
              <p className="min-w-0 break-words rounded-lg bg-surface-secondary px-3 py-2 font-mono text-xs leading-relaxed text-muted line-clamp-4">
                <span className="sr-only">{copy.previewLabel}: </span>
                {call.preview}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p id={expiryId} className="text-xs text-subtle">
        {expiryText(pause.expiresAt, language)}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={answered}
          onClick={() => decide("once")}
          className={`${BUTTON} bg-foreground font-semibold text-background`}
        >
          {copy.allowOnce}
        </button>
        {offersAlways(pause) && (
          <button
            type="button"
            disabled={answered}
            onClick={() => decide("always")}
            className={`${BUTTON} border border-border bg-background text-foreground hover:bg-surface-secondary`}
          >
            {copy.allowAlways}
          </button>
        )}
        <button
          type="button"
          disabled={answered}
          onClick={() => decide("deny")}
          className={`${BUTTON} border border-border bg-background text-danger hover:bg-danger-soft`}
        >
          {copy.deny}
        </button>
      </div>
    </section>
  );
}
