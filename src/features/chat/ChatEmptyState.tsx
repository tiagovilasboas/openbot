"use client";

import { Button, Card, IconCalendar, IconChevronRight } from "@heroui/react";
import { chatCopy } from "./chat-copy";
import type { ChatLanguage } from "./respond-to-message";

interface ChatEmptyStateProps {
  language: ChatLanguage;
  onSelectPrompt: (prompt: string) => void;
}

export function ChatEmptyState({
  language,
  onSelectPrompt,
}: ChatEmptyStateProps) {
  const content = chatCopy[language];

  return (
    <section className="flex flex-1 flex-col justify-center gap-6 py-6 sm:items-center sm:py-12">
      <div className="flex w-full max-w-2xl flex-col gap-3 sm:items-center sm:text-center">
        <p className="text-sm font-medium text-accent">OpenBot</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {content.emptyHeading}
        </h2>
        <p className="max-w-xl text-sm text-muted sm:text-base">
          {content.intro}
        </p>
      </div>

      <Card className="w-full max-w-2xl" variant="secondary">
        <Card.Header>
          <Card.Title>{content.tryThis}</Card.Title>
          <Card.Description>{content.tryThisDescription}</Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-2">
          <Button
            variant="tertiary"
            fullWidth
            className="justify-between"
            onPress={() =>
              onSelectPrompt(
                language === "pt"
                  ? "issues de tiagovilasboas/openbot"
                  : "issues of tiagovilasboas/openbot",
              )
            }
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <span aria-hidden="true" className="text-base font-semibold">
                &lt;/&gt;
              </span>
              <span className="min-w-0">
                <span className="block truncate">
                  {content.gitHubSamplePrompt}
                </span>
                <span className="block truncate text-xs text-muted">
                  {content.gitHubSampleDetail}
                </span>
              </span>
            </span>
            <IconChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="tertiary"
            fullWidth
            className="justify-between"
            onPress={() => onSelectPrompt(content.prompt)}
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <IconCalendar aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate">{content.prompt}</span>
                <span className="block truncate text-xs text-muted">
                  {content.promptDetail}
                </span>
              </span>
            </span>
            <IconChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="tertiary"
            fullWidth
            className="justify-between"
            onPress={() => onSelectPrompt(content.sample)}
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <span aria-hidden="true" className="text-base">
                i
              </span>
              <span className="min-w-0">
                <span className="block truncate">{content.sample}</span>
                <span className="block truncate text-xs text-muted">
                  {content.sampleDetail}
                </span>
              </span>
            </span>
            <IconChevronRight aria-hidden="true" />
          </Button>
        </Card.Content>
      </Card>
    </section>
  );
}
