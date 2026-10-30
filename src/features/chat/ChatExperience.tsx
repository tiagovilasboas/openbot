"use client";

import {
  Button,
  ButtonGroup,
  Card,
  Chip,
  IconCalendar,
  IconChevronRight,
  IconPlus,
  TextArea,
} from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/features/calendar/list-example-events";
import { chatCopy } from "./chat-copy";
import { respondToMessage, type ChatLanguage } from "./respond-to-message";
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
  const content = chatCopy[language];

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  async function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || busy) return;
    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", language, text },
    ]);
    setDraft("");
    setBusy(true);
    const reply = respondToMessage(text, language);
    if (reply.kind === "calendar")
      await new Promise((resolve) => setTimeout(resolve, 300));
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
    setMessages([]);
    setDraft("");
  }

  return (
    <main className="dark flex min-h-dvh w-full min-w-0 flex-col bg-background text-foreground">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-separator px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground"
          >
            &gt;_
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">
              {content.title}
            </h1>
            <p className="truncate text-xs text-muted">{content.subtitle}</p>
          </div>
        </div>
        <nav
          aria-label={
            language === "pt" ? "Navegação principal" : "Main navigation"
          }
          className="flex shrink-0 items-center gap-2"
        >
          <ButtonGroup aria-label={language === "pt" ? "Idioma" : "Language"}>
            {(["pt", "en"] as const).map((option) => (
              <Button
                key={option}
                size="lg"
                variant={language === option ? "secondary" : "ghost"}
                aria-pressed={language === option}
                onPress={() => setLanguage(option)}
              >
                {option.toUpperCase()}
              </Button>
            ))}
          </ButtonGroup>
        </nav>
      </header>

      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3 py-4">
          <Chip color="warning" variant="soft" className="max-w-full lg:hidden">
            {content.demo}
          </Chip>
          <Button
            variant="tertiary"
            size="lg"
            onPress={startNewChat}
            aria-label={language === "pt" ? "Nova conversa" : "New chat"}
            className="hidden sm:inline-flex"
          >
            <IconPlus aria-hidden="true" />
            {language === "pt" ? "Nova conversa" : "New chat"}
          </Button>
          <Button
            variant="tertiary"
            size="lg"
            isIconOnly
            onPress={startNewChat}
            aria-label={language === "pt" ? "Nova conversa" : "New chat"}
            className="sm:hidden"
          >
            <IconPlus aria-hidden="true" />
          </Button>
        </div>

        {messages.length === 0 ? (
          <section className="flex flex-1 flex-col justify-center gap-6 py-6 sm:items-center sm:py-12">
            <div className="flex w-full max-w-2xl flex-col gap-3 sm:items-center sm:text-center">
              <p className="text-sm font-medium text-accent">OpenBot</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {language === "pt"
                  ? "O que você quer resolver?"
                  : "What would you like to get done?"}
              </h2>
              <p className="max-w-xl text-sm text-muted sm:text-base">
                {content.intro}
              </p>
            </div>

            <Card className="w-full max-w-2xl" variant="secondary">
              <Card.Header>
                <Card.Title>{content.tryThis}</Card.Title>
                <Card.Description>
                  {language === "pt"
                    ? "Escolha uma ação para testar a demonstração."
                    : "Choose an action to try the demo."}
                </Card.Description>
              </Card.Header>
              <Card.Content className="flex flex-col gap-2">
                <Button
                  variant="tertiary"
                  fullWidth
                  className="justify-between"
                  onPress={() => void sendMessage(content.prompt)}
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
                  onPress={() => void sendMessage(content.sample)}
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
        ) : (
          <section
            aria-label={language === "pt" ? "Conversa" : "Conversation"}
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
                {language === "pt" ? "Pensando..." : "Thinking..."}
              </p>
            )}
          </section>
        )}

        <form
          className="sticky bottom-0 w-full pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <div className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl border border-separator bg-surface p-2">
            <TextArea
              aria-label={content.composerLabel}
              className="min-h-10 flex-1 resize-none border-0 bg-transparent shadow-none"
              placeholder={content.placeholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              rows={1}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isIconOnly
              isDisabled={!draft.trim() || busy}
              aria-label={
                language === "pt" ? "Enviar mensagem" : "Send message"
              }
            >
              ↑
            </Button>
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-muted">
            {content.composerHint}
          </p>
        </form>
      </div>
    </main>
  );
}
