"use client";

import { Button, Card, Chip, IconPlus } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/features/calendar/list-example-events";
import { chatCopy } from "./chat-copy";
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
  const nextId = useRef(1);
  const conversationIdRef = useRef(0);
  const content = chatCopy[language];

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  async function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || busy) return;
    const conversationId = conversationIdRef.current;
    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", language, text },
    ]);
    setDraft("");
    setBusy(true);
    const reply = respondToMessage(text, language);
    if (reply.kind === "calendar")
      await new Promise((resolve) => setTimeout(resolve, 300));
    if (conversationIdRef.current !== conversationId) return;
    setMessages((current) => [
      ...current,
      {
        id: nextId.current++,
        role: "assistant",
        language,
        text: reply.text,
        ...(reply.kind === "calendar" ? { events: reply.events } : {}),
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
      <ChatHeader language={language} onLanguageChange={setLanguage} />

      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3 py-4">
          <Chip color="warning" variant="soft" className="max-w-full lg:hidden">
            {content.demo}
          </Chip>
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
    </main>
  );
}
