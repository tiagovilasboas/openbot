"use client";

import { IonApp, IonButton, IonTextarea } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { chatCopy } from "./chat-copy";
import { respondToMessage, type ChatLanguage } from "./respond-to-message";
import type { CalendarEvent } from "@/features/calendar/list-example-events";

type ChatMessage = {
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const nextMessageId = useRef(1);
  const content = chatCopy[language];

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  function addMessage(message: Omit<ChatMessage, "id">) {
    setMessages((current) => [
      ...current,
      { ...message, id: nextMessageId.current++ },
    ]);
  }

  async function sendMessage(text = draft) {
    const message = text.trim();
    if (!message || busy) return;

    addMessage({ role: "user", text: message, language });
    setDraft("");
    setBusy(true);
    const reply = respondToMessage(message, language);

    if (reply.kind === "calendar") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      addMessage({
        role: "assistant",
        language,
        text: reply.text,
        events: reply.events,
      });
    } else {
      addMessage({ role: "assistant", text: reply.text, language });
    }
    setBusy(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLIonTextareaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <IonApp>
      <div className="openbot-page">
        <header className="chat-header">
          <div className="header-content">
            <div className="brand-lockup">
              <span className="brand-mark" aria-hidden="true">
                O
              </span>
              <div>
                <p className="brand-name">{content.title}</p>
                <p className="brand-subtitle">{content.subtitle}</p>
              </div>
            </div>
            <div className="header-actions">
              <span className="demo-status">
                <span className="status-dot" aria-hidden="true" />
                {content.demo}
              </span>
              <div
                className="language-switch"
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
          </div>
        </header>

        <main className="conversation" aria-live="polite">
          {messages.length === 0 ? (
            <section className="welcome-state">
              <p className="welcome-kicker">OPEN BOT</p>
              <h1>
                {language === "pt"
                  ? "Por onde começamos?"
                  : "Where should we start?"}
              </h1>
              <p className="welcome-copy">{content.intro}</p>
              <div
                className="suggestions"
                aria-label={
                  language === "pt"
                    ? "Sugestões de mensagem"
                    : "Suggested messages"
                }
              >
                <button
                  type="button"
                  onClick={() => void sendMessage(content.prompt)}
                >
                  <span aria-hidden="true">◷</span>
                  {content.prompt}
                </button>
                <button
                  type="button"
                  onClick={() => void sendMessage(content.sample)}
                >
                  {content.sample}
                </button>
              </div>
            </section>
          ) : (
            <div className="message-list">
              <p className="demo-note">{content.demo}</p>
              {messages.map((message) => (
                <article
                  className={`message-row message-${message.role}`}
                  key={message.id}
                >
                  {message.role === "assistant" && (
                    <span className="assistant-mark" aria-hidden="true">
                      O
                    </span>
                  )}
                  <div className="message-body">
                    <p className="message-text">{message.text}</p>
                    {message.events && (
                      <section
                        className="tool-result"
                        aria-label={chatCopy[message.language].tool}
                      >
                        <div className="tool-heading">
                          <span className="tool-symbol" aria-hidden="true">
                            ↳
                          </span>
                          <span>{chatCopy[message.language].tool}</span>
                        </div>
                        <ul>
                          {message.events.map((event) => (
                            <li key={event.id}>
                              <time>{event.time}</time>
                              <div>
                                <strong>{event.title}</strong>
                                <span>{event.detail}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <p className="tool-source">
                          {chatCopy[message.language].source}
                        </p>
                      </section>
                    )}
                  </div>
                </article>
              ))}
              {busy && (
                <p className="working-state" role="status">
                  {content.working}
                </p>
              )}
            </div>
          )}
        </main>

        <footer className="composer-footer">
          <form className="composer-wrap" onSubmit={handleSubmit}>
            <div className="composer">
              <IonTextarea
                aria-label={content.placeholder}
                autoGrow
                className="message-input"
                enterkeyhint="send"
                key={language}
                maxlength={2000}
                placeholder={content.placeholder}
                value={draft}
                onIonInput={(event) => setDraft(event.detail.value ?? "")}
                onKeyDown={handleKeyDown}
              />
              <IonButton
                aria-label={content.send}
                className="send-button"
                disabled={!draft.trim() || busy}
                type="submit"
              >
                <span aria-hidden="true">↑</span>
              </IonButton>
            </div>
            <p className="composer-caption">
              {language === "pt"
                ? "A demonstração usa apenas respostas locais e dados fictícios."
                : "This demo uses local responses and fictional data only."}
            </p>
          </form>
        </footer>
      </div>
    </IonApp>
  );
}
