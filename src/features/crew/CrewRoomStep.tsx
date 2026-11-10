"use client";

import { useId, useState } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { crewRoomCopy } from "./crew-room-copy.ts";
import { formatStepDuration } from "./crew-room-format.ts";
import type { CrewRoomStep as Step } from "./crew-room-view.ts";

interface CrewRoomStepProps {
  step: Step;
  position: number;
  total: number;
  language: ChatLanguage;
}

/** One specialist's step: who, what they were asked, how it went, the reply. */
export function CrewRoomStep({
  step,
  position,
  total,
  language,
}: CrewRoomStepProps) {
  const copy = crewRoomCopy[language];
  const replyId = useId();
  const [open, setOpen] = useState(false);
  const failed = step.status === "failed";

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center" aria-hidden="true">
        <BotAvatar
          shape={step.bot.avatarShape}
          color={step.bot.avatarColor}
          size={32}
        />
        <span className="mt-1 w-px flex-1 bg-separator" />
      </div>
      <div className="min-w-0 flex-1 pb-5">
        <h4 className="text-[15px] font-semibold text-foreground">
          {step.bot.name}
          <span className="sr-only"> ({copy.stepOf(position, total)})</span>
        </h4>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              failed
                ? "bg-danger-soft text-danger"
                : "bg-bot-accent-soft text-bot-accent"
            }`}
          >
            {failed ? copy.statusFailed : copy.statusDone}
          </span>
          {step.durationMs !== null && (
            <span className="tabular-nums text-muted">
              <span className="sr-only">{copy.durationLabel}: </span>
              {formatStepDuration(step.durationMs, language)}
            </span>
          )}
        </p>
        <p className="mt-2 text-[13px] leading-snug text-muted">
          <span className="font-medium text-foreground">{copy.taskLabel}:</span>{" "}
          <span className="break-words">{step.task ?? copy.noTask}</span>
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={replyId}
          onClick={() => setOpen((value) => !value)}
          className="mt-2 min-h-11 rounded-full border border-border bg-surface px-4 text-[13px] font-medium text-foreground transition-colors duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary"
        >
          {open ? copy.hideReply : copy.showReply}
        </button>
        <div
          id={replyId}
          hidden={!open}
          className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-surface px-3 py-2.5 text-[14px] leading-[1.55] text-foreground"
        >
          {step.text}
        </div>
      </div>
    </li>
  );
}
