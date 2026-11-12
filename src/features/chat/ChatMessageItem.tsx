"use client";

import type { AttachmentSummary } from "@/features/attachments/attachment-summary.ts";
import { SentAttachments } from "@/features/attachments/SentAttachments.tsx";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { CrewRoomView } from "@/features/crew/crew-room-view.ts";
import { CrewRoomControl } from "@/features/crew/CrewRoomControl.tsx";
import type { CrewStepRecord } from "@/features/crew/crew-step-record.ts";
import { GitHubItemsCard } from "@/features/github/GitHubItemsCard.tsx";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { CompactedDivider } from "@/features/compaction/CompactedDivider.tsx";
import type { CompactedMeta } from "@/features/compaction/compaction-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { CopyButton } from "./CopyButton.tsx";
import {
  canRetryIncomplete,
  incompleteNote,
  type IncompleteKind,
} from "./incomplete-reply.ts";
import { FailoverNotice } from "./FailoverNotice.tsx";
import { FormattedMessage } from "./FormattedMessage.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import type { RollbackBlock } from "./roll-back-thread.ts";
import { RollbackControl } from "./RollbackControl.tsx";

export interface MessageData {
  id: number;
  language: ChatLanguage;
  role: "assistant" | "user";
  text: string;
  delegatedBot?: BotProfile;
  /** On a specialist's reply: the task it was given and how it went. */
  crewStep?: CrewStepRecord;
  github?: {
    repo: GitHubRepoRef;
    items: GitHubItem[];
  };
  modelBadge?: string;
  /** Names and sizes of the files sent with this user message; never text. */
  attachments?: AttachmentSummary[];
  /** The text is partial: the reply broke off or the user cancelled it. */
  incomplete?: IncompleteKind;
  failover?: {
    fromModel: string;
    toModel: string;
    reason: string;
  };
  /**
   * Set on the marker that stands for compacted history: `text` is the
   * summary, the originals are archived here and never sent to the model.
   */
  compacted?: CompactedMeta;
}

/** What the user's message needs to offer "go back to this message". */
export interface MessageRollback {
  messagesAfter: number;
  blocked: RollbackBlock | null;
  onRollBack: (messageId: number) => void;
}

interface ChatMessageItemProps {
  message: MessageData;
  activeBot?: BotProfile;
  onOpenSettings?: () => void;
  /** Resends the user message this partial reply answered. */
  onRetry?: () => void;
  rollback?: MessageRollback;
  /** On a delegated turn's final reply: the room that shows how it went. */
  crewRoom?: CrewRoomView;
}

export function ChatMessageItem({
  message,
  activeBot,
  onRetry,
  rollback,
  crewRoom,
}: ChatMessageItemProps) {
  const content = chatCopy[message.language];

  if (message.compacted) return <CompactedDivider message={message} />;

  if (message.role === "user") {
    return (
      <article className="group flex w-full flex-col items-end gap-1 animate-enter">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-surface px-4 py-2.5 text-base leading-[1.55] text-foreground md:text-[15px]">
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {message.attachments && message.attachments.length > 0 && (
            <SentAttachments
              language={message.language}
              files={message.attachments}
            />
          )}
        </div>
        {rollback && (
          <div className="-mt-1 pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100">
            <RollbackControl
              language={message.language}
              messagesAfter={rollback.messagesAfter}
              blocked={rollback.blocked}
              onConfirm={() => rollback.onRollBack(message.id)}
            />
          </div>
        )}
      </article>
    );
  }

  const displayingBot = message.delegatedBot || activeBot;

  return (
    <article className="group flex w-full flex-col gap-2 animate-enter">
      <header className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {displayingBot && (
          <BotAvatar
            shape={displayingBot.avatarShape}
            color={displayingBot.avatarColor}
            size={26}
          />
        )}
        <span className="text-[13px] font-medium text-foreground">
          {displayingBot?.name || content.title}
        </span>
        {message.delegatedBot && (
          <span className="rounded-full bg-bot-accent-soft px-2 py-0.5 text-xs font-medium text-bot-accent">
            {content.viaBot} @{message.delegatedBot.name}
          </span>
        )}
        {message.modelBadge && (
          <span className="truncate font-mono text-xs font-medium text-subtle">
            {message.modelBadge}
          </span>
        )}
      </header>

      <FormattedMessage content={message.text} language={message.language} />

      {message.incomplete && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <span>{incompleteNote(message.incomplete, content)}</span>
          {canRetryIncomplete(message.incomplete) && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 rounded-full border border-border bg-surface px-4 font-medium text-foreground transition-colors duration-(--duration-micro) ease-out-expo hover:bg-surface-secondary"
            >
              {content.retryAction}
            </button>
          )}
        </div>
      )}

      {message.github && (
        <div className="w-full">
          <GitHubItemsCard
            repo={message.github.repo}
            items={message.github.items}
            language={message.language}
          />
        </div>
      )}

      {message.failover && (
        <FailoverNotice
          language={message.language}
          fromModel={message.failover.fromModel}
          toModel={message.failover.toModel}
          reason={message.failover.reason}
        />
      )}

      {crewRoom && (
        <CrewRoomControl room={crewRoom} language={message.language} />
      )}

      <div className="-ml-3 -mt-1 flex items-center pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100">
        <CopyButton
          text={message.text}
          language={message.language}
          kind="message"
        />
      </div>
    </article>
  );
}
