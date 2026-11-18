"use client";

import { useEffect, useRef } from "react";
import type { ComposerAttachments } from "@/features/attachments/use-composer-attachments.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import {
  ComposerModelProvider,
  type ComposerModelControl,
} from "@/features/bots/composer-model-context.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { ChatEmptyState } from "./ChatEmptyState.tsx";
import type { MessageBranch, MessageData } from "./ChatMessageItem.tsx";
import { ConversationView } from "./ConversationView.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import type { RollbackBlock } from "./roll-back-thread.ts";
import type { ToolTurnView } from "./tool-turn-view.ts";

interface ChatConversationPaneProps {
  language: ChatLanguage;
  messages: MessageData[];
  liveMessages: MessageData[];
  activeBot: BotProfile;
  /** The bot shown as thinking, when a crew member answers the Chief. */
  workingBot: BotProfile | null;
  mainBotId: string;
  busy: boolean;
  draft: string;
  queueCount: number;
  isConfigured: boolean;
  activeBotSkills: SkillDefinition[];
  mentionableBots: BotProfile[];
  attachments: ComposerAttachments;
  composerModel: ComposerModelControl;
  /** True while the connect gate keeps the empty state in place. */
  locked: boolean;
  composerLockedReason: string | undefined;
  /** The server has not said yet whether it has a model. */
  connectChecking: boolean;
  rollbackBlocked: RollbackBlock | null;
  toolTurn: ToolTurnView;
  onDraftChange: (value: string) => void;
  onSend: (value?: string) => void;
  onOpenSettings: () => void;
  onCancel: () => void;
  onRetry: (userMessageId: number) => void;
  onRollBack: (userMessageId: number) => void;
  branch: MessageBranch;
}

/** The chat body: the empty state or the conversation, with the model chip. */
export function ChatConversationPane({
  language,
  messages,
  liveMessages,
  activeBot,
  workingBot,
  mainBotId,
  busy,
  draft,
  queueCount,
  isConfigured,
  activeBotSkills,
  mentionableBots,
  attachments,
  composerModel,
  locked,
  composerLockedReason,
  connectChecking,
  rollbackBlocked,
  toolTurn,
  onDraftChange,
  onSend,
  onOpenSettings,
  onCancel,
  onRetry,
  onRollBack,
  branch,
}: ChatConversationPaneProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      // Smooth scrolling would queue up behind every frame of a streaming reply.
      messagesEndRef.current?.scrollIntoView({
        behavior: liveMessages.length > 0 ? "auto" : "smooth",
      });
    }
  }, [messages, liveMessages, busy]);

  return (
    <ComposerModelProvider value={composerModel}>
      {messages.length === 0 || locked ? (
        <ChatEmptyState
          language={language}
          draft={draft}
          busy={busy}
          skills={activeBotSkills}
          bots={mentionableBots}
          activeBot={activeBot}
          mainBotId={mainBotId}
          isConfigured={isConfigured}
          composerLockedReason={composerLockedReason}
          connectChecking={connectChecking}
          attachments={attachments}
          onOpenSettings={onOpenSettings}
          onDraftChange={onDraftChange}
          onSend={() => void onSend()}
          onSelectPrompt={(prompt) => void onSend(prompt)}
        />
      ) : (
        <ConversationView
          language={language}
          messages={messages}
          liveMessages={liveMessages}
          activeBot={activeBot}
          busy={busy}
          thinkingBot={workingBot ?? activeBot}
          draft={draft}
          queueCount={queueCount}
          isConfigured={isConfigured}
          activeBotSkills={activeBotSkills}
          bots={mentionableBots}
          attachments={attachments}
          messagesEndRef={messagesEndRef}
          onDraftChange={onDraftChange}
          onSend={() => void onSend()}
          onOpenSettings={onOpenSettings}
          onCancel={onCancel}
          onRetry={onRetry}
          rollbackBlocked={rollbackBlocked}
          onRollBack={onRollBack}
          branch={branch}
          toolTurn={toolTurn}
        />
      )}
    </ComposerModelProvider>
  );
}
