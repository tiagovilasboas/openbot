"use client";

import type { RefObject } from "react";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import { ChatMessageItem, type MessageData } from "./ChatMessageItem.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import { ThinkingIndicator } from "./ThinkingIndicator.tsx";

export interface ConversationViewProps {
  language: ChatLanguage;
  messages: MessageData[];
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
}

export function ConversationView({
  language,
  messages,
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
}: ConversationViewProps) {
  const content = chatCopy[language];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section
          aria-label={content.conversationLabel}
          aria-live="polite"
          className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-6 pt-4 md:px-6"
        >
          {messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              activeBot={activeBot}
              onOpenSettings={onOpenSettings}
            />
          ))}
          {busy && (
            <ThinkingIndicator
              bot={thinkingBot ?? activeBot}
              language={language}
            />
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
