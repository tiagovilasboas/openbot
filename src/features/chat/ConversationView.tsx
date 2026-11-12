"use client";

import { Fragment, useMemo, useRef, type RefObject } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ComposerAttachments } from "@/features/attachments/use-composer-attachments.ts";
import { crewRoomsBySynthesisId } from "@/features/crew/crew-room-view.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { ApprovalCard } from "@/features/tools/client/ApprovalCard.tsx";
import { toolRunning } from "@/features/tools/client/live-tool-steps.ts";
import { toolsCopy } from "@/features/tools/client/tools-copy.ts";
import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import { ChatMessageItem, type MessageData } from "./ChatMessageItem.tsx";
import { userMessageBefore } from "./retry-partial-reply.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import type { RollbackBlock } from "./roll-back-thread.ts";
import { ThinkingIndicator } from "./ThinkingIndicator.tsx";
import type { ToolTurnView } from "./tool-turn-view.ts";

export interface ConversationViewProps {
  language: ChatLanguage;
  messages: MessageData[];
  /** Replies still arriving; shown after the stored ones, never stored. */
  liveMessages: MessageData[];
  activeBot: BotProfile;
  busy: boolean;
  /** The bot shown as thinking; a crew member while it answers the Chief. */
  thinkingBot?: BotProfile;
  draft: string;
  queueCount: number;
  isConfigured: boolean;
  activeBotSkills: SkillDefinition[];
  bots: BotProfile[];
  attachments?: ComposerAttachments;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onDraftChange: (val: string) => void;
  onSend: () => void;
  onOpenSettings: () => void;
  onCancel: () => void;
  /** Resends a user message that has no reply. */
  onRetry: (userMessageId: number) => void;
  /** Why going back is off right now, or null when it is allowed. */
  rollbackBlocked: RollbackBlock | null;
  /** Cuts the thread before a user message and restores its text. */
  onRollBack: (userMessageId: number) => void;
  /** The tool turn: a pause to approve, its steps and notice. */
  toolTurn?: ToolTurnView;
}

export function ConversationView({
  language,
  messages,
  liveMessages,
  activeBot,
  busy,
  thinkingBot,
  draft,
  queueCount,
  isConfigured,
  activeBotSkills,
  bots,
  attachments,
  messagesEndRef,
  onDraftChange,
  onSend,
  onOpenSettings,
  onCancel,
  onRetry,
  rollbackBlocked,
  onRollBack,
  toolTurn,
}: ConversationViewProps) {
  const content = chatCopy[language];
  const footerRef = useRef<HTMLElement>(null);
  // The approval card shows only on the thread of the bot that paused.
  const paused =
    toolTurn?.paused?.botId === activeBot.id ? toolTurn.paused : null;
  const crewRooms = useMemo(() => crewRoomsBySynthesisId(messages), [messages]);
  const lastMessage = messages[messages.length - 1];
  const unanswered =
    !busy && queueCount === 0 && lastMessage?.role === "user"
      ? lastMessage
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section
          aria-label={content.conversationLabel}
          aria-live="polite"
          aria-busy={busy}
          className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-6 pt-4 md:px-6"
        >
          {messages.map((message, index) => {
            // A resume streams the whole reply live; the stored copy waits.
            if (busy && message.id === toolTurn?.resumingId) return null;
            const answered = userMessageBefore(messages, index);
            const pausedHere = paused?.messageId === message.id;
            return (
              <Fragment key={message.id}>
                <ChatMessageItem
                  message={
                    pausedHere ? { ...message, text: paused.text } : message
                  }
                  liveSteps={pausedHere ? paused.steps : undefined}
                  activeBot={activeBot}
                  crewRoom={crewRooms.get(message.id)}
                  onOpenSettings={onOpenSettings}
                  onRetry={
                    busy || !answered ? undefined : () => onRetry(answered.id)
                  }
                  rollback={{
                    messagesAfter: messages.length - index - 1,
                    blocked: rollbackBlocked,
                    onRollBack,
                  }}
                />
                {pausedHere && toolTurn && (
                  <ApprovalCard
                    pause={paused.pause}
                    language={language}
                    onDecide={(choice) => {
                      toolTurn.onDecide(choice);
                      footerRef.current?.querySelector("textarea")?.focus();
                    }}
                  />
                )}
              </Fragment>
            );
          })}
          {liveMessages.length > 0 && (
            // Growing text is not announced; the finished reply is, once.
            <div aria-live="off" className="flex flex-col gap-6">
              {liveMessages.map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  activeBot={activeBot}
                />
              ))}
            </div>
          )}
          {busy && (
            <ThinkingIndicator
              bot={thinkingBot ?? activeBot}
              turnBot={activeBot}
              hasStreamedText={liveMessages.length > 0}
              usingTool={toolRunning(toolTurn?.steps ?? [])}
              language={language}
              onCancel={onCancel}
            />
          )}
          {!busy && toolTurn?.unavailableBotId === activeBot.id && (
            <p role="status" className="text-[13px] text-muted">
              {toolsCopy[language].unavailableNotice}
            </p>
          )}
          {unanswered && (
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <span>{content.retryHint}</span>
              <button
                type="button"
                onClick={() => onRetry(unanswered.id)}
                className="min-h-11 rounded-full border border-border bg-surface px-4 font-medium text-foreground transition-colors duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary"
              >
                {content.retryAction}
              </button>
            </div>
          )}
          <div ref={messagesEndRef} className="h-px" />
        </section>
      </div>

      <footer
        ref={footerRef}
        className="relative shrink-0 bg-background px-4 pb-[max(var(--safe-bottom),0.75rem)] md:px-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-full h-6 bg-gradient-to-t from-background to-transparent"
        />
        <div className="mx-auto w-full max-w-3xl">
          {queueCount > 0 && (
            <div className="mb-2 flex justify-center">
              <span
                role="status"
                className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium tabular-nums text-muted"
              >
                {queueCount} {content.queueSuffix}
              </span>
            </div>
          )}
          <ChatComposer
            mode="docked"
            isConfigured={isConfigured}
            language={language}
            draft={draft}
            busy={busy}
            queueCount={queueCount}
            skills={activeBotSkills}
            bots={bots}
            attachments={attachments}
            onDraftChange={onDraftChange}
            onSend={onSend}
          />
        </div>
      </footer>
    </div>
  );
}
