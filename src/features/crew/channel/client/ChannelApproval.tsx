"use client";

import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { Language } from "@/features/language/language.ts";
import { ApprovalCard } from "@/features/tools/client/ApprovalCard.tsx";
import type { DecisionChoice } from "@/features/tools/client/paused-turn.ts";
import type { ChannelApproval as Approval } from "./channels-api.ts";
import { getChannelsCopy } from "./channels-copy.ts";

interface ChannelApprovalProps {
  approval: Approval;
  bots: BotProfile[];
  language: Language;
  onDecide: (choice: DecisionChoice) => void;
}

/**
 * A member's tool call waiting for the person, in the timeline: the same
 * card as a 1:1 chat, with the member's name above it.
 */
export function ChannelApproval({
  approval,
  bots,
  language,
  onDecide,
}: ChannelApprovalProps) {
  const copy = getChannelsCopy(language);
  const bot = bots.find((item) => item.id === approval.botId);
  return (
    <div className="flex flex-col gap-2" data-testid="group-approval">
      <p className="text-xs md:text-[13px] text-muted">
        {copy.approvalFrom(bot?.name ?? copy.removedBot)}
      </p>
      <ApprovalCard
        key={approval.pause.turnId}
        pause={approval.pause}
        language={language}
        onDecide={onDecide}
      />
    </div>
  );
}
