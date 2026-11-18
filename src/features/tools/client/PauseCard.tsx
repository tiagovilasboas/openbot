"use client";

import type { Language } from "@/features/language/language.ts";
import { ApprovalCard } from "./ApprovalCard.tsx";
import { AskUserCard } from "./AskUserCard.tsx";
import { askCallOf, type PauseReply } from "./paused-turn.ts";
import type { ApprovalPause } from "./tool-stream-events.ts";

/** The card a paused turn needs: a question to answer, or tools to approve. */
export function PauseCard({
  pause,
  language,
  onReply,
}: {
  pause: ApprovalPause;
  language: Language;
  onReply: (reply: PauseReply) => void;
}) {
  const ask = askCallOf(pause);
  if (ask?.ask) {
    return (
      <AskUserCard
        callId={ask.callId}
        turnId={pause.turnId}
        ask={ask.ask}
        expiresAt={pause.expiresAt}
        language={language}
        onReply={onReply}
      />
    );
  }
  return <ApprovalCard pause={pause} language={language} onDecide={onReply} />;
}
