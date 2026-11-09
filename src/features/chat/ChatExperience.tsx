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
import { useModelStatus } from "@/features/model/use-model-status.ts";
import { ChatEmptyState } from "./ChatEmptyState.tsx";
import { ChatHeader } from "./ChatHeader.tsx";
import type { MessageData } from "./ChatMessageItem.tsx";
import { ChatSidebar } from "./ChatSidebar.tsx";
import { ConversationView } from "./ConversationView.tsx";
import { executeChatMessage } from "./execute-chat-message.ts";
import { buildReplyMessages } from "./reply-messages.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { useBotMessages } from "./use-bot-messages.ts";
import { useMessageQueue } from "./use-message-queue.ts";

export function ChatExperience() {
  const [language, setLanguage] = useState<ChatLanguage>("pt");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // While the Chief's crew answers, the thinking row follows the working bot.
  const [workingBot, setWorkingBot] = useState<BotProfile | null>(null);
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
    mainBotId,
    makeMainBot,
  } = useBots();
  const { messages, persistMessages, getNextId, clearMessages } =
    useBotMessages(activeBot.id);

  // The active bot's own skills feed the composer's command palette.
  const activeBotSkills = activeBot.skills;

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
  const { status: modelStatus, recordModelCall } = useModelStatus(
    modelConfig,
    isConfigured,
  );
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
      bots,
      mainBotId,
      gitHubToken,
      modelConfig,
      onBotWorking: setWorkingBot,
    });
    recordModelCall(reply.modelCall);
    setWorkingBot(null);

    if (conversationIdRef.current !== conversationId) {
      setBusy(false);
      return;
    }

    const updatedWithAssistant: MessageData[] = [
      ...currentHistory,
      ...buildReplyMessages(reply, {
        language,
        modelBadge: isConfigured ? activeModelLabel : undefined,
        nextId: getNextId,
      }),
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
        mainBotId={mainBotId}
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
      />

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <ChatHeader
          language={language}
          onLanguageChange={setLanguage}
          activeModelLabel={activeModelLabel}
          modelStatus={modelStatus}
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
            mainBotId={mainBotId}
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
            thinkingBot={workingBot ?? activeBot}
            draft={draft}
            queueCount={queueCount}
            isConfigured={isConfigured}
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
        onLanguageChange={setLanguage}
        currentConfig={modelConfig}
        hasPassword={auth.hasPassword}
        authHint={auth.hint}
        onClose={() => setIsSettingsOpen(false)}
        onSetupPassword={auth.setupPassword}
        onRemovePassword={auth.removePassword}
        onChangePassword={auth.changePassword}
      />

      <BotEditModal
        isOpen={isBotModalOpen}
        bot={botToEdit}
        language={language}
        isMain={botToEdit?.id === mainBotId}
        canDelete={bots.length > 1 && botToEdit?.id !== mainBotId}
        onClose={() => {
          setIsBotModalOpen(false);
          setBotToEdit(null);
        }}
        onSave={(updated) =>
          botToEdit ? saveBot(updated) : createAndActivateBot(updated)
        }
        onDelete={removeBot}
        onMakeMain={makeMainBot}
      />
    </div>
  );
}
