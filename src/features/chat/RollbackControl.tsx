"use client";

import { useId, useState } from "react";
import { chatCopy } from "./chat-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import type { RollbackBlock } from "./roll-back-thread.ts";

interface RollbackControlProps {
  language: ChatLanguage;
  /** Messages after this one, which the cut discards. */
  messagesAfter: number;
  /** Why going back is not allowed right now, or null. */
  blocked: RollbackBlock | null;
  onConfirm: () => void;
}

const ghostButton =
  "min-h-11 rounded-full px-3 text-xs font-medium transition-colors duration-140 ease-out-expo active:scale-[0.97]";

/** Two-step "go back here", the same pattern as deleting a bot. */
export function RollbackControl({
  language,
  messagesAfter,
  blocked,
  onConfirm,
}: RollbackControlProps) {
  const content = chatCopy[language];
  const reasonId = useId();
  const [confirming, setConfirming] = useState(false);

  if (blocked) {
    const reason =
      blocked === "running" ? content.rollbackRunning : content.rollbackQueued;
    return (
      <div className="flex flex-wrap items-center justify-end gap-x-2">
        <button
          type="button"
          aria-disabled="true"
          aria-describedby={reasonId}
          className={`${ghostButton} cursor-not-allowed text-subtle opacity-60`}
        >
          {content.rollbackAction}
        </button>
        <span id={reasonId} className="text-xs text-muted">
          {reason}
        </span>
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        title={content.rollbackActionHint}
        aria-label={`${content.rollbackAction}: ${content.rollbackActionHint}`}
        onClick={() => setConfirming(true)}
        className={`${ghostButton} text-subtle hover:bg-surface hover:text-foreground`}
      >
        {content.rollbackAction}
      </button>
    );
  }

  const discardNote =
    messagesAfter === 0
      ? content.rollbackDiscardNone
      : `${messagesAfter} ${
          messagesAfter === 1
            ? content.rollbackDiscardOne
            : content.rollbackDiscardMany
        }`;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-end gap-1"
      onKeyDown={(event) => {
        if (event.key === "Escape") setConfirming(false);
      }}
    >
      <span className="px-2 text-xs font-medium text-danger">
        {discardNote}
      </span>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          onConfirm();
        }}
        className={`${ghostButton} bg-danger text-danger-foreground`}
      >
        {content.rollbackConfirmAction}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={`${ghostButton} text-muted hover:bg-surface hover:text-foreground`}
      >
        {content.rollbackDismiss}
      </button>
    </div>
  );
}
