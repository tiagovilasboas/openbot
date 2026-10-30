"use client";

import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatToolCalls,
  Icon,
  Layout,
  LayoutContent,
  Theme,
} from "@astryxdesign/core";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { chatCopy } from "./chat-copy";
import { respondToMessage, type ChatLanguage } from "./respond-to-message";
import type { CalendarEvent } from "@/features/calendar/list-example-events";

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

  const emptyState = (
    <section className="welcome-state">
      <div className="welcome-path">{content.newSession}</div>
      <h1>
        {language === "pt"
          ? "O que você precisa resolver?"
          : "What can I help you with?"}
      </h1>
      <p className="welcome-copy">{content.intro}</p>
      <div
        className="suggestions"
        aria-label={
          language === "pt" ? "Sugestões de mensagem" : "Suggested messages"
        }
      >
        <button type="button" onClick={() => void sendMessage(content.prompt)}>
          <Icon icon="calendar" size="sm" />
          {content.prompt}
        </button>
        <button type="button" onClick={() => void sendMessage(content.sample)}>
          <Icon icon="info" size="sm" />
          {content.sample}
        </button>
      </div>
    </section>
  );
  const composer = (
    <ChatComposer
      value={draft}
      onChange={setDraft}
      onSubmit={(value) => void sendMessage(value)}
      isDisabled={busy}
      placeholder={content.placeholder}
      density="spacious"
      elevation="none"
      className="openbot-composer"
      headerActions={
        <span className="composer-heading">
          <span className="composer-heading-mark" aria-hidden="true">
            ›
          </span>
          {content.composerLabel}
        </span>
      }
      headerContext={
        <span className="composer-key-hint">{content.composerHint}</span>
      }
    />
  );

  return (
    <Theme theme={neutralTheme} mode="dark">
      <Layout
        className={`openbot-page${messages.length === 0 ? " chat-empty" : ""}`}
        height="fill"
      >
        <header className="chat-header">
          <Link className="brand-lockup" href="/" aria-label={content.title}>
            <span className="brand-mark">
              <span className="terminal-mark" aria-hidden="true">
                &gt;_
              </span>
            </span>
            <span>
              <strong className="brand-name">{content.title}</strong>
              <small className="brand-subtitle">{content.subtitle}</small>
            </span>
          </Link>
          <div className="header-actions">
            <span className="demo-status">
              <span className="status-dot" />
              {content.demo}
            </span>
            <div
              className="language-switch"
              role="group"
              aria-label={language === "pt" ? "Idioma" : "Language"}
            >
              {(["pt", "en"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={language === option}
                  onClick={() => setLanguage(option)}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </header>
        <LayoutContent className="chat-content">
          <ChatLayout
            className={
              messages.length === 0 ? "chat-landing-layout" : undefined
            }
            density="balanced"
            emptyState={messages.length === 0 ? emptyState : undefined}
            composer={composer}
          >
            {messages.length > 0 && (
              <ChatMessageList align="bottom" isStreaming={busy}>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    sender={message.role}
                    name={
                      message.role === "assistant" ? content.title : content.you
                    }
                    className={`openbot-message openbot-message-${message.role}`}
                  >
                    <ChatMessageBubble
                      className="openbot-message-bubble"
                      variant="ghost"
                    >
                      {message.text}
                    </ChatMessageBubble>
                    {message.events && (
                      <ChatToolCalls
                        label={chatCopy[message.language].tool}
                        calls={[
                          {
                            name: "list_events",
                            status: "complete",
                            target: chatCopy[message.language].source,
                            duration: "300ms",
                            resultDetail: (
                              <ul className="event-list">
                                {message.events.map((event) => (
                                  <li key={event.id}>
                                    <time>{event.time}</time>
                                    <span>
                                      <strong>{event.title}</strong>
                                      <small>{event.detail}</small>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ),
                          },
                        ]}
                      />
                    )}
                  </ChatMessage>
                ))}
              </ChatMessageList>
            )}
          </ChatLayout>
        </LayoutContent>
      </Layout>
    </Theme>
  );
}
