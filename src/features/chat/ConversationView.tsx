"use client";

import type { RefObject } from "react";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import { ChatMessageItem, type MessageData } from "./ChatMessageItem.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

export interface ConversationViewProps {
  language: ChatLanguage;
  messages: MessageData[];
  activeBot: BotProfile;
  busy: boolean;
  draft: string;
  queueCount: number;
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
  draft,
  queueCount,
  activeBotSkills,
  bots,
  messagesEndRef,
  onDraftChange,
  onSend,
  onOpenSettings,
}: ConversationViewProps) {
  const content = chatCopy[language];

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 sm:px-6">
        <section
          aria-label={content.conversationLabel}
          aria-live="polite"
          className="flex w-full flex-col gap-5"
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
            <div
              className="flex w-full items-center gap-3 pt-1 animate-in fade-in duration-200"
              role="status"
            >
              <BotAvatar
                shape={activeBot.avatarShape}
                color={activeBot.avatarColor}
                size={28}
                className="animate-pulse"
              />
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1.5 shadow-sm">
                <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce" />
                <span className="sr-only">{content.thinking}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </section>
      </div>

      <footer className="shrink-0 border-t border-white/5 bg-black/90 p-3 sm:px-6 backdrop-blur-xl">
        <div className="w-full">
          <ChatComposer
            mode="docked"
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
