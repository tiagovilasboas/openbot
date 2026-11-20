"use client";

import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ComposerAttachments } from "@/features/attachments/use-composer-attachments.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { FirstRunCard } from "@/features/onboarding/FirstRunCard.tsx";
import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import { TerminalIcon } from "./ComposerIcons.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import { WelcomeStarters } from "./WelcomeStarters.tsx";

export interface ChatEmptyStateProps {
  language: ChatLanguage;
  draft: string;
  busy: boolean;
  skills?: SkillDefinition[];
  bots?: BotProfile[];
  activeBot?: BotProfile;
  mainBotId?: string;
  isConfigured?: boolean;
  /** No model yet: the composer is locked and says why. */
  composerLockedReason?: string;
  /** The server has not said yet whether it has a model: no first-run card. */
  connectChecking?: boolean;
  attachments?: ComposerAttachments;
  onOpenSettings?: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

function greetingFor(
  language: ChatLanguage,
  bot?: BotProfile,
  mainBotId?: string,
) {
  const content = chatCopy[language];
  if (!bot) {
    return { title: content.emptyHeading, subtitle: content.emptySubheading };
  }
  return {
    title: content.botGreeting.replace("{bot}", bot.name),
    subtitle:
      bot.id === mainBotId
        ? content.chiefOfStaffTitle
        : bot.title || content.emptySubheading,
  };
}

/**
 * New-chat screen. Phone: greeting centered above, composer docked in the
 * thumb zone with the suggestions just above it. Desktop: one centered group.
 */
export function ChatEmptyState({
  language,
  draft,
  busy,
  skills,
  bots,
  activeBot,
  mainBotId,
  isConfigured,
  composerLockedReason,
  connectChecking,
  attachments,
  onOpenSettings,
  onDraftChange,
  onSend,
}: ChatEmptyStateProps) {
  const { title, subtitle } = greetingFor(language, activeBot, mainBotId);

  return (
    <section className="flex min-h-0 flex-1 flex-col md:overflow-y-auto md:px-6 md:py-10">
      <div className="flex min-h-0 flex-1 flex-col md:m-auto md:w-full md:max-w-2xl md:flex-none">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 md:flex-none md:overflow-visible md:px-0">
          <div className="my-auto flex animate-enter flex-col items-center py-4 text-center [--empty-avatar:48px] md:py-0 md:pb-8 md:[--empty-avatar:80px]">
            {activeBot ? (
              <BotAvatar
                shape={activeBot.avatarShape}
                color={activeBot.avatarColor}
                size="var(--empty-avatar)"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-2xl border border-border bg-surface text-foreground md:size-14"
              >
                <TerminalIcon className="size-6" />
              </span>
            )}
            <h2 className="mt-3 line-clamp-2 max-w-md text-balance wrap-anywhere text-xl font-semibold leading-tight tracking-[-0.015em] text-foreground md:mt-5 md:line-clamp-none md:max-w-xl md:text-[32px] md:tracking-[-0.025em]">
              {title}
            </h2>
            <p className="mt-1 max-w-md text-pretty text-[13px] text-muted md:mt-2 md:text-[15px]">
              {subtitle}
            </p>

            {onOpenSettings && (
              <FirstRunCard
                language={language}
                isConfigured={Boolean(isConfigured)}
                isChecking={Boolean(connectChecking)}
                onOpenSettings={onOpenSettings}
                onStarter={(prompt) => {
                  if (!draft) onDraftChange(prompt);
                }}
              />
            )}
          </div>
        </div>

        <div className="group/dock flex flex-col">
          <div className="order-2 px-2 pb-[max(var(--safe-bottom),0.5rem)] md:order-1 md:px-0 md:pb-0">
            <ChatComposer
              mode="hero"
              isConfigured={isConfigured}
              disabledReason={composerLockedReason}
              language={language}
              draft={draft}
              busy={busy}
              skills={skills}
              bots={bots}
              attachments={attachments}
              onDraftChange={onDraftChange}
              onSend={onSend}
            />
          </div>
          {composerLockedReason || !activeBot ? null : (
            <WelcomeStarters
              language={language}
              bot={activeBot}
              className={`order-1 pb-2 group-has-[[data-composer-palette]]/dock:pointer-events-none group-has-[[data-composer-palette]]/dock:opacity-0 md:order-2 md:pb-0 md:pt-4 ${draft ? "hidden" : ""}`}
              onPick={onDraftChange}
            />
          )}
        </div>
      </div>
    </section>
  );
}
