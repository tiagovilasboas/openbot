"use client";

import { useEffect, useRef, useState } from "react";
import { LockScreen } from "@/features/auth/LockScreen.tsx";
import { useLocalAuth } from "@/features/auth/use-local-auth.ts";
import { BotEditModal } from "@/features/bots/BotEditModal.tsx";
import { botAccent } from "@/features/bots/bot-accent.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { useBots } from "@/features/bots/use-bots.ts";
import { useGitHubToken } from "@/features/github/use-github-token.ts";
import { formatModelBadge } from "@/features/model/model-config.ts";
import { SettingsModal } from "@/features/model/SettingsModal.tsx";
import {
  fetchActiveServerModel,
  type ActiveServerModelOutcome,
} from "@/features/model/test-model-connection.ts";
import { useModelConfig } from "@/features/model/use-model-config.ts";
import { useSkills } from "@/features/skills/use-skills.ts";
import { ChatEmptyState } from "./ChatEmptyState.tsx";
import { ChatHeader } from "./ChatHeader.tsx";
import type { MessageData } from "./ChatMessageItem.tsx";
import { ChatSidebar } from "./ChatSidebar.tsx";
import { ConversationView } from "./ConversationView.tsx";
import { executeChatMessage } from "./execute-chat-message.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { useBotMessages } from "./use-bot-messages.ts";
import { useMessageQueue } from "./use-message-queue.ts";

export function ChatExperience() {
  const [language, setLanguage] = useState<ChatLanguage>("pt");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const auth = useLocalAuth();
  const { queueCount, enqueue, dequeue, clearQueue } = useMessageQueue();

  // Dots / Grok Bot systems
  const {
    bots,
    activeBot,
    activeBotId,
    setActiveBotId,
    saveBot,
    createAndActivateBot,
    removeBot,
  } = useBots();
  const { allSkills, addCustomSkill, removeCustomSkill } = useSkills();
  const { messages, persistMessages, getNextId, clearMessages } =
    useBotMessages(activeBot.id);

  // Filter skills belonging to active bot for composer / palette
  const activeBotSkills = allSkills.filter((s) =>
    activeBot.skills.includes(s.id),
  );

  // Sidebar & Modals state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [botToEdit, setBotToEdit] = useState<BotProfile | null>(null);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);

  const modelConfig = useModelConfig();
  const gitHubToken = useGitHubToken();
  const [serverModel, setServerModel] =
    useState<ActiveServerModelOutcome | null>(null);

  const conversationIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

  // The active bot's accent drives focus rings, caret, selection and the
  // bot's own chrome, including portaled sheets, so it lives on <html>.
  const activeAccent = botAccent(activeBot.avatarColor);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bot-accent", activeAccent);
    return () => {
      root.style.removeProperty("--bot-accent");
    };
  }, [activeAccent]);

  useEffect(() => {
    void fetchActiveServerModel().then((server) => setServerModel(server));
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
      : formatModelBadge(null, false, language);

  async function processTurn(
    turnText: string,
    currentHistory: MessageData[],
    conversationId: number,
  ) {
    setBusy(true);
    const history = currentHistory.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const reply = await executeChatMessage({
      text: turnText,
      language,
      history,
      activeBot,
      allSkills,
      bots,
      gitHubToken,
      modelConfig,
    });

    if (conversationIdRef.current !== conversationId) {
      setBusy(false);
      return;
    }

    const updatedWithAssistant: MessageData[] = [
      ...currentHistory,
      {
        id: getNextId(),
        role: "assistant",
        language,
        text: reply.text,
        delegatedBot: reply.delegatedBot,
        modelBadge: isConfigured ? activeModelLabel : undefined,
        ...(reply.github ? { github: reply.github } : {}),
        ...(reply.failover ? { failover: reply.failover } : {}),
      },
    ];
    persistMessages(updatedWithAssistant);
    setBusy(false);

    // If another message was queued in the meantime, process it sequentially
    const nextQueued = dequeue();
    if (nextQueued && nextQueued.conversationId === conversationIdRef.current) {
      void processTurn(nextQueued.text, updatedWithAssistant, conversationId);
    }
  }

  function sendMessage(value = draft) {
    const text = value.trim();
    if (!text) return;
    const conversationId = conversationIdRef.current;
    const userMsgId = getNextId();
    const updatedMessages: MessageData[] = [
      ...messages,
      { id: userMsgId, role: "user", language, text },
    ];
    persistMessages(updatedMessages);
    setDraft("");

    if (busy) {
      enqueue({ id: userMsgId, text, conversationId });
      return;
    }

    void processTurn(text, updatedMessages, conversationId);
  }

  function startNewChat() {
    conversationIdRef.current += 1;
    clearQueue();
    clearMessages();
    setDraft("");
    setBusy(false);
  }

  if (auth.hasPassword && auth.isLocked) {
    return (
      <LockScreen language={language} hint={auth.hint} onUnlock={auth.unlock} />
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <ChatSidebar
        language={language}
        bots={bots}
        activeBotId={activeBotId}
        isMobileOpen={isMobileSidebarOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        hasPassword={auth.hasPassword}
        onLock={auth.lock}
        onToggleDesktopCollapse={() => setIsDesktopCollapsed((v) => !v)}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelectBot={(id) => {
          clearQueue();
          setActiveBotId(id);
        }}
        onCreateBot={() => {
          setBotToEdit(null);
          setIsBotModalOpen(true);
        }}
        onEditBot={(b) => {
          setBotToEdit(b);
          setIsBotModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewChat={startNewChat}
        canStartNewChat={messages.length > 0}
        onLanguageChange={setLanguage}
      />

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <ChatHeader
          language={language}
          onLanguageChange={setLanguage}
          activeModelLabel={activeModelLabel}
          isConfigured={isConfigured}
          onOpenSettings={() => setIsSettingsOpen(true)}
          hasMessages={messages.length > 0}
          onNewChat={startNewChat}
          activeBot={activeBot}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onOpenBotEdit={() => {
            setBotToEdit(activeBot);
            setIsBotModalOpen(true);
          }}
        />

        {messages.length === 0 ? (
          <ChatEmptyState
            language={language}
            draft={draft}
            busy={busy}
            skills={activeBotSkills}
            bots={bots}
            activeBot={activeBot}
            isConfigured={isConfigured}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onDraftChange={setDraft}
            onSend={() => void sendMessage()}
            onSelectPrompt={(prompt) => void sendMessage(prompt)}
          />
        ) : (
          <ConversationView
            language={language}
            messages={messages}
            activeBot={activeBot}
            busy={busy}
            draft={draft}
            queueCount={queueCount}
            activeBotSkills={activeBotSkills}
            bots={bots}
            messagesEndRef={messagesEndRef}
            onDraftChange={setDraft}
            onSend={() => void sendMessage()}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        language={language}
        currentConfig={modelConfig}
        skills={allSkills}
        hasPassword={auth.hasPassword}
        authHint={auth.hint}
        onClose={() => setIsSettingsOpen(false)}
        onAddSkill={addCustomSkill}
        onRemoveSkill={removeCustomSkill}
        onSetupPassword={auth.setupPassword}
        onRemovePassword={auth.removePassword}
        onChangePassword={auth.changePassword}
      />

      <BotEditModal
        isOpen={isBotModalOpen}
        bot={botToEdit}
        allSkills={allSkills}
        language={language}
        canDelete={bots.length > 1}
        onClose={() => {
          setIsBotModalOpen(false);
          setBotToEdit(null);
        }}
        onSave={(updated) =>
          botToEdit ? saveBot(updated) : createAndActivateBot(updated)
        }
        onDelete={removeBot}
      />
    </div>
  );
}
