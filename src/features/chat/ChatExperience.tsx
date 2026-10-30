"use client";

import {
  AppShell,
  Badge,
  Button,
  Card,
  Center,
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatToolCalls,
  Icon,
  List,
  ListItem,
  SegmentedControl,
  SegmentedControlItem,
  Stack,
  Text,
  Theme,
  TopNav,
  TopNavHeading,
} from "@astryxdesign/core";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/features/calendar/list-example-events";
import { chatCopy } from "./chat-copy";
import { respondToMessage, type ChatLanguage } from "./respond-to-message";

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
    <Center width="100%" height="100%" padding={2}>
      <Stack gap={2} width="100%" maxWidth={720} hAlign="start">
        <Badge
          label={content.demo}
          variant="info"
          icon={<Icon icon="info" size="sm" />}
        />
        <Text as="h1" type="display-3">
          {language === "pt"
            ? "O que você quer resolver?"
            : "What would you like to get done?"}
        </Text>
        <Text as="p" type="supporting" color="secondary">
          {content.intro}
        </Text>
        <Card variant="default" padding={3} width="100%">
          <Stack gap={2}>
            <Text as="h2" type="label">
              {content.tryThis}
            </Text>
            <Stack gap={1}>
              <Button
                label={content.prompt}
                variant="secondary"
                size="lg"
                width="100%"
                icon={<Icon icon="calendar" size="sm" />}
                onClick={() => void sendMessage(content.prompt)}
              />
              <Button
                label={content.sample}
                variant="secondary"
                size="lg"
                width="100%"
                icon={<Icon icon="info" size="sm" />}
                onClick={() => void sendMessage(content.sample)}
              />
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Center>
  );

  const composer = (
    <ChatComposer
      value={draft}
      onChange={setDraft}
      onSubmit={(value) => void sendMessage(value)}
      isDisabled={busy}
      placeholder={content.placeholder}
      density="compact"
      elevation="low"
      headerActions={<Text type="code">{content.composerLabel}</Text>}
      headerContext={<Text type="supporting">{content.composerHint}</Text>}
    />
  );

  const navigationLabel = language === "pt" ? "Idioma" : "Language";

  return (
    <Theme theme={neutralTheme} mode="dark">
      <AppShell
        height="fill"
        variant="wash"
        contentPadding={0}
        mobileNav={false}
        topNav={
          <TopNav
            label={
              language === "pt" ? "Navegação principal" : "Main navigation"
            }
            heading={
              <TopNavHeading
                heading={content.title}
                headingHref="/"
                logo={<Text type="code">&gt;_</Text>}
                subheading={content.subtitle}
              />
            }
            endContent={
              <SegmentedControl
                label={navigationLabel}
                value={language}
                size="lg"
                onChange={(value) => {
                  if (value === "pt" || value === "en") setLanguage(value);
                }}
              >
                <SegmentedControlItem value="pt" label="PT" />
                <SegmentedControlItem value="en" label="EN" />
              </SegmentedControl>
            }
          />
        }
      >
        <Center width="100%" height="100%" padding={2}>
          <Stack direction="vertical" width="100%" height="100%" maxWidth={720}>
            <ChatLayout
              density="compact"
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
                        message.role === "assistant"
                          ? content.title
                          : content.you
                      }
                    >
                      <ChatMessageBubble variant="ghost">
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
                                <List density="compact" hasDividers>
                                  {message.events.map((event) => (
                                    <ListItem
                                      key={event.id}
                                      label={event.title}
                                      description={event.detail}
                                      startContent={
                                        <Text type="code">{event.time}</Text>
                                      }
                                    />
                                  ))}
                                </List>
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
          </Stack>
        </Center>
      </AppShell>
    </Theme>
  );
}
