"use client";

import { useMemo, type RefObject } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { crewRoomsBySynthesisId } from "@/features/crew/crew-room-view.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import { ChatMessageItem, type MessageData } from "./ChatMessageItem.tsx";
import { userMessageBefore } from "./retry-partial-reply.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import type { RollbackBlock } from "./roll-back-thread.ts";
import { ThinkingIndicator } from "./ThinkingIndicator.tsx";

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
  messagesEndRef,
  onDraftChange,
  onSend,
  onOpenSettings,
  onCancel,
  onRetry,
  rollbackBlocked,
  onRollBack,
}: ConversationViewProps) {
  const content = chatCopy[language];
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
            const answered = userMessageBefore(messages, index);
            return (
              <ChatMessageItem
                key={message.id}
                message={message}
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
              language={language}
              onCancel={onCancel}
            />
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

      <footer className="relative shrink-0 bg-background px-4 pb-[max(var(--safe-bottom),0.75rem)] md:px-6">
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
            onDraftChange={onDraftChange}
            onSend={onSend}
          />
        </div>
      </footer>
    </div>
  );
}
