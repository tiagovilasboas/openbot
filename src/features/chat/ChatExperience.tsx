"use client";

import { Button, Card, Chip, IconPlus } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/features/calendar/list-example-events";
import { formatModelBadge } from "@/features/model/model-config";
import { useModelConfig } from "@/features/model/use-model-config";
import { SettingsModal } from "@/features/model/SettingsModal";
import {
  fetchActiveServerModel,
  type ActiveServerModelOutcome,
} from "@/features/model/test-model-connection";
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
};

export function ChatExperience() {
  const [language, setLanguage] = useState<ChatLanguage>("pt");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const modelConfig = useModelConfig();
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
    const demo = respondToMessage(text, language);
    let reply: { text: string; events?: CalendarEvent[] };
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
    if (conversationIdRef.current !== conversationId) return;
    setMessages((current) => [
      ...current,
      {
        id: nextId.current++,
        role: "assistant",
        language,
        text: reply.text,
        ...(reply.events ? { events: reply.events } : {}),
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
