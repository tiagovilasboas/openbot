"use client";

import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { SkillDefinition } from "@/features/skills/skill-types.ts";
import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import { PlugIcon, TerminalIcon } from "./ComposerIcons.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import { SuggestionChips } from "./SuggestionChips.tsx";

export interface ChatEmptyStateProps {
  language: ChatLanguage;
  draft: string;
  busy: boolean;
  skills?: SkillDefinition[];
  bots?: BotProfile[];
  activeBot?: BotProfile;
  isConfigured?: boolean;
  onOpenSettings?: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSelectPrompt: (prompt: string) => void;
}

const MANAGER_BOT_IDS = new Set(["chief-of-staff", "default"]);

function greetingFor(language: ChatLanguage, bot?: BotProfile) {
  const content = chatCopy[language];
  if (!bot) {
    return { title: content.emptyHeading, subtitle: content.emptySubheading };
  }
  return {
    title: content.botGreeting.replace("{bot}", bot.name),
    subtitle: MANAGER_BOT_IDS.has(bot.id)
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
  isConfigured,
  onOpenSettings,
  onDraftChange,
  onSend,
  onSelectPrompt,
}: ChatEmptyStateProps) {
  const content = chatCopy[language];
  const { title, subtitle } = greetingFor(language, activeBot);

  return (
    <section className="flex min-h-0 flex-1 flex-col md:overflow-y-auto md:px-6 md:py-10">
      <div className="flex min-h-0 flex-1 flex-col md:m-auto md:w-full md:max-w-2xl md:flex-none">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 md:flex-none md:overflow-visible md:px-0">
          <div className="my-auto flex animate-enter flex-col items-center py-8 text-center md:py-0 md:pb-8">
            {activeBot ? (
              <BotAvatar
                shape={activeBot.avatarShape}
                color={activeBot.avatarColor}
                size={67}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-2xl border border-border bg-surface text-foreground"
              >
                <TerminalIcon className="size-6" />
              </span>
            )}
            <h2 className="mt-4 max-w-md text-balance text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground md:mt-5 md:max-w-xl md:text-[32px] md:tracking-[-0.025em]">
              {title}
            </h2>
            <p className="mt-2 max-w-md text-pretty text-[15px] text-muted">
              {subtitle}
            </p>

            {!isConfigured && onOpenSettings && (
              <p className="mt-5 max-w-sm text-balance text-[13px] leading-5 text-muted">
                <PlugIcon className="mr-1.5 inline size-4 align-[-3px] text-subtle" />
                {content.connectAiNotice}{" "}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="-my-3 inline-flex min-h-11 items-center rounded-full px-1.5 align-middle font-medium text-foreground underline decoration-border underline-offset-4 transition-[text-decoration-color,transform] duration-(--duration-micro) ease-out-expo hover:decoration-foreground active:scale-[0.97]"
                >
                  {content.connectAiSetup}
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="group/dock flex flex-col">
          <div className="order-2 px-4 pb-[max(var(--safe-bottom),0.75rem)] md:order-1 md:px-0 md:pb-0">
            <ChatComposer
              mode="hero"
              isConfigured={isConfigured}
              language={language}
              draft={draft}
              busy={busy}
              skills={skills}
              bots={bots}
              onDraftChange={onDraftChange}
              onSend={onSend}
            />
          </div>
          <SuggestionChips
            language={language}
            isHidden={Boolean(draft)}
            className="order-1 pb-3 group-has-[[data-composer-palette]]/dock:pointer-events-none group-has-[[data-composer-palette]]/dock:opacity-0 md:order-2 md:pb-0 md:pt-5"
            onSelectPrompt={onSelectPrompt}
          />
        </div>
      </div>
    </section>
  );
}
