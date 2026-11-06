"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/features/calendar/list-example-events.ts";
import { detectGitHubRequest } from "@/features/github/detect-github-request.ts";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import { listRepositoryItems } from "@/features/github/list-repository-items.ts";
import { useGitHubToken } from "@/features/github/use-github-token.ts";
import { formatModelBadge } from "@/features/model/model-config.ts";
import { SettingsModal } from "@/features/model/SettingsModal.tsx";
import {
  fetchActiveServerModel,
  type ActiveServerModelOutcome,
} from "@/features/model/test-model-connection.ts";
import { useModelConfig } from "@/features/model/use-model-config.ts";
import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import { ChatEmptyState } from "./ChatEmptyState.tsx";
import { ChatHeader } from "./ChatHeader.tsx";
import { ChatMessageItem, type MessageData } from "./ChatMessageItem.tsx";
import { requestModelReply } from "./request-model-reply.ts";
import { respondToMessage, type ChatLanguage } from "./respond-to-message.ts";

export function ChatExperience() {
  const [language, setLanguage] = useState<ChatLanguage>("pt");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const modelConfig = useModelConfig();
  const gitHubToken = useGitHubToken();
  const [serverModel, setServerModel] =
    useState<ActiveServerModelOutcome | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const nextId = useRef(1);
  const conversationIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const content = chatCopy[language];

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  useEffect(() => {
    void fetchActiveServerModel().then((server) => {
      setServerModel(server);
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, busy]);

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
    <main className="dark flex h-dvh max-h-dvh w-full min-w-0 flex-col bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
      <ChatHeader
        language={language}
        onLanguageChange={setLanguage}
        activeModelLabel={activeModelLabel}
        isConfigured={isConfigured}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasMessages={messages.length > 0}
        onNewChat={startNewChat}
      />

      {messages.length === 0 ? (
        <ChatEmptyState
          language={language}
          draft={draft}
          busy={busy}
          onDraftChange={setDraft}
          onSend={() => void sendMessage()}
          onSelectPrompt={(prompt) => void sendMessage(prompt)}
        />
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <section
            aria-label={content.conversationLabel}
            aria-live="polite"
            className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6"
          >
            {messages.map((message) => (
              <ChatMessageItem key={message.id} message={message} />
            ))}
            {busy && (
              <div
                className="flex w-full items-center gap-3 animate-pulse pt-2"
                role="status"
              >
                <div
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 font-mono text-xs font-semibold"
                >
                  &gt;_
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  {content.thinking}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </section>

          <div className="sticky bottom-0 z-20 w-full bg-gradient-to-t from-black via-black/95 to-transparent pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
            <div className="mx-auto w-full max-w-3xl">
              <ChatComposer
                mode="docked"
                language={language}
                draft={draft}
                busy={busy}
                onDraftChange={setDraft}
                onSend={() => void sendMessage()}
              />
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        language={language}
        currentConfig={modelConfig}
        onClose={() => setIsSettingsOpen(false)}
      />
    </main>
  );
}
