"use client";

import { Button, Card, Chip, IconPlus } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/features/calendar/list-example-events";
import { detectGitHubRequest } from "@/features/github/detect-github-request";
import { GitHubItemsCard } from "@/features/github/GitHubItemsCard";
import type { GitHubItem, GitHubRepoRef } from "@/features/github/github-types";
import { listRepositoryItems } from "@/features/github/list-repository-items";
import { useGitHubToken } from "@/features/github/use-github-token";
import { formatModelBadge } from "@/features/model/model-config";
import { SettingsModal } from "@/features/model/SettingsModal";
import {
  fetchActiveServerModel,
  type ActiveServerModelOutcome,
} from "@/features/model/test-model-connection";
import { useModelConfig } from "@/features/model/use-model-config";
import { chatCopy } from "./chat-copy";
import { requestModelReply } from "./request-model-reply";
import { respondToMessage, type ChatLanguage } from "./respond-to-message";
import { ChatComposer } from "./ChatComposer";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatHeader } from "./ChatHeader";
import { ChatToolResult } from "./ChatToolResult";

type Message = {
  id: number;
  language: ChatLanguage;
  role: "assistant" | "user";
  text: string;
  events?: CalendarEvent[];
  github?: {
    repo: GitHubRepoRef;
    items: GitHubItem[];
  };
};

export function ChatExperience() {
  const [language, setLanguage] = useState<ChatLanguage>("pt");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const modelConfig = useModelConfig();
  const gitHubToken = useGitHubToken();
  const [serverModel, setServerModel] =
    useState<ActiveServerModelOutcome | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const nextId = useRef(1);
  const conversationIdRef = useRef(0);
  const content = chatCopy[language];

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  useEffect(() => {
    void fetchActiveServerModel().then((server) => {
      setServerModel(server);
    });
  }, []);

  const isConfigured = Boolean(modelConfig || serverModel?.configured);
  const activeModelLabel = modelConfig
    ? formatModelBadge(modelConfig, false, language)
    : serverModel?.configured
      ? formatModelBadge(serverModel, false, language)
      : formatModelBadge(null, true, language);

  async function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || busy) return;
    const conversationId = conversationIdRef.current;
    const history = [...messages, { role: "user" as const, text }].map(
      ({ role, text }) => ({ role, text }),
    );
    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", language, text },
    ]);
    setDraft("");
    setBusy(true);

    const detected = detectGitHubRequest(text);
    let reply: {
      text: string;
      events?: CalendarEvent[];
      github?: { repo: GitHubRepoRef; items: GitHubItem[] };
    };

    if (detected.isGitHubRequest) {
      const result = await listRepositoryItems(detected.repo, gitHubToken);
      if (result.ok) {
        let items = result.items;
        if (detected.itemType === "prs") {
          items = items.filter((item) => item.isPullRequest);
        } else if (detected.itemType === "issues") {
          items = items.filter((item) => !item.isPullRequest);
        }
        const labelKind =
          detected.itemType === "prs"
            ? content.githubPRs
            : detected.itemType === "issues"
              ? content.githubIssues
              : content.githubOpenItems;
        const summaryText =
          language === "pt"
            ? `Encontrei ${items.length} ${labelKind} em ${detected.repo.owner}/${detected.repo.repo}:`
            : `Found ${items.length} ${labelKind} in ${detected.repo.owner}/${detected.repo.repo}:`;
        reply = {
          text: summaryText,
          github: { repo: detected.repo, items },
        };
      } else {
        const errorText =
          result.error === "repo_not_found"
            ? content.githubRepoNotFound
            : result.error === "rate_limited"
              ? content.githubRateLimited
              : result.error === "unauthorized"
                ? content.githubUnauthorized
                : content.githubNetworkError;
        reply = { text: errorText };
      }
    } else {
      const demo = respondToMessage(text, language);
      if (demo.kind === "calendar") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        reply = { text: demo.text, events: demo.events };
      } else {
        const outcome = await requestModelReply(
          language,
          history,
          fetch,
          modelConfig,
        );
        reply =
          outcome.kind === "text"
            ? { text: outcome.text }
            : outcome.kind === "unavailable"
              ? { text: demo.text }
              : { text: content.modelError };
      }
    }

    if (conversationIdRef.current !== conversationId) return;
    setMessages((current) => [
      ...current,
      {
        id: nextId.current++,
        role: "assistant",
        language,
        text: reply.text,
        ...(reply.events ? { events: reply.events } : {}),
        ...(reply.github ? { github: reply.github } : {}),
      },
    ]);
    setBusy(false);
  }

  function startNewChat() {
    conversationIdRef.current += 1;
    setMessages([]);
    setDraft("");
    setBusy(false);
  }

  return (
    <main className="dark flex min-h-dvh w-full min-w-0 flex-col bg-background text-foreground">
      <ChatHeader
        language={language}
        onLanguageChange={setLanguage}
        activeModelLabel={activeModelLabel}
        isConfigured={isConfigured}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3 py-4">
          {!isConfigured ? (
            <Chip
              color="warning"
              variant="soft"
              className="max-w-full lg:hidden"
            >
              {content.demo}
            </Chip>
          ) : (
            <div />
          )}
          <Button
            variant="tertiary"
            size="lg"
            onPress={startNewChat}
            aria-label={content.newChat}
            className="hidden sm:inline-flex"
          >
            <IconPlus aria-hidden="true" />
            {content.newChat}
          </Button>
          <Button
            variant="tertiary"
            size="lg"
            isIconOnly
            onPress={startNewChat}
            aria-label={content.newChat}
            className="sm:hidden"
          >
            <IconPlus aria-hidden="true" />
          </Button>
        </div>

        {messages.length === 0 ? (
          <ChatEmptyState
            language={language}
            onSelectPrompt={(prompt) => void sendMessage(prompt)}
          />
        ) : (
          <section
            aria-label={content.conversationLabel}
            aria-live="polite"
            className="flex flex-1 flex-col gap-6 py-6"
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  variant={message.role === "user" ? "secondary" : "default"}
                  className="w-fit max-w-[min(90%,42rem)]"
                >
                  <Card.Header className="pb-0">
                    <Card.Title className="text-xs text-muted">
                      {message.role === "assistant"
                        ? chatCopy[message.language].title
                        : chatCopy[message.language].you}
                    </Card.Title>
                  </Card.Header>
                  <Card.Content className="whitespace-pre-wrap text-sm">
                    {message.text}
                    {message.events && (
                      <ChatToolResult
                        events={message.events}
                        language={message.language}
                      />
                    )}
                    {message.github && (
                      <GitHubItemsCard
                        repo={message.github.repo}
                        items={message.github.items}
                        language={message.language}
                      />
                    )}
                  </Card.Content>
                </Card>
              </article>
            ))}
            {busy && (
              <p className="text-sm text-muted" role="status">
                {content.thinking}
              </p>
            )}
          </section>
        )}

        <ChatComposer
          language={language}
          draft={draft}
          busy={busy}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        language={language}
        currentConfig={modelConfig}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
