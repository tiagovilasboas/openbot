"use client";

import { useEffect, useRef, useState } from "react";
import { messageFitsRequest } from "@/features/attachments/request-size.ts";
import { toPayloads } from "@/features/attachments/attachment-summary.ts";
import { useComposerAttachments } from "@/features/attachments/use-composer-attachments.ts";
import { useAttention } from "@/features/attention/use-attention.ts";
import { LockScreen } from "@/features/auth/LockScreen.tsx";
import { useLocalAuth } from "@/features/auth/use-local-auth.ts";
import { BotsSyncNotice } from "@/features/bots/sync/BotsSyncNotice.tsx";
import { ConversationsSyncNotice } from "@/features/conversations/sync/ConversationsSyncNotice.tsx";
import { useConversationsSync } from "@/features/conversations/sync/use-conversations-sync.ts";
import { SettingsSyncNotice } from "@/features/settings/sync/SettingsSyncNotice.tsx";
import { useSettingsSync } from "@/features/settings/sync/use-settings-sync.ts";
import { MemorySyncNotice } from "@/features/memory/sync/MemorySyncNotice.tsx";
import { UsageSyncNotice } from "@/features/usage/sync/UsageSyncNotice.tsx";
import { useUsageSync } from "@/features/usage/sync/use-usage-sync.ts";
import { BotEditModal } from "@/features/bots/BotEditModal.tsx";
import { botAccent } from "@/features/bots/bot-accent.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import { useBots } from "@/features/bots/use-bots.ts";
import { useGitHubToken } from "@/features/github/use-github-token.ts";
import { useContextUsage } from "@/features/context-window/use-context-usage.ts";
import { formatModelBadge } from "@/features/model/model-config.ts";
import { SettingsModal } from "@/features/model/SettingsModal.tsx";
import {
  fetchActiveServerModel,
  type ActiveServerModelOutcome,
} from "@/features/model/test-model-connection.ts";
import { useModelConfig } from "@/features/model/use-model-config.ts";
import { useMigrateLocalKeys } from "@/features/key-vault/use-migrate-local-keys.ts";
import { useModelStatus } from "@/features/model/use-model-status.ts";
import { ChatEmptyState } from "./ChatEmptyState.tsx";
import { ChatHeader } from "./ChatHeader.tsx";
import { ChatSidebar } from "./ChatSidebar.tsx";
import { ConversationView } from "./ConversationView.tsx";
import { focusComposer } from "./focus-composer.ts";
import { rollBackThread, rollbackBlock } from "./roll-back-thread.ts";
import { useBotMessages } from "./use-bot-messages.ts";
import { HTML_LANG } from "../language/language.ts";
import { useChatTurns } from "./use-chat-turns.ts";
import { useLanguage } from "./use-language.ts";
import { useMessageQueue } from "./use-message-queue.ts";

export function ChatExperience() {
  const [language, setLanguage] = useLanguage();
  const [draft, setDraft] = useState("");
  const attachments = useComposerAttachments();
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
    reorderBot,
    mainBotId,
    makeMainBot,
    syncError,
    dismissSyncError,
  } = useBots();
  const { messages, persistMessages, getNextId, clearMessages } =
    useBotMessages(activeBot.id);
  const conversationsSync = useConversationsSync();
  const settingsSync = useSettingsSync();
  const usageSync = useUsageSync();

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[language];
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
  useMigrateLocalKeys();

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

  const contextUsage = useContextUsage(
    messages,
    modelConfig?.model ?? serverModel?.model,
    activeBot,
    language,
  );

  const { attentionCounts, noteReply } = useAttention(
    activeBot.id,
    bots.map((b) => b.id),
  );

  const {
    busy,
    liveMessages,
    workingBot,
    workingBotIds,
    sendText,
    cancelTurn,
    retryMessage,
    resetConversation,
  } = useChatTurns({
    language,
    activeBot,
    bots,
    mainBotId,
    gitHubToken,
    modelConfig,
    modelBadge: isConfigured ? activeModelLabel : undefined,
    recordModelCall,
    persistMessages,
    getNextId,
    clearMessages,
    enqueue,
    dequeue,
    clearQueue,
    onReply: noteReply,
  });

  useEffect(() => {
    if (messages.length > 0) {
      // Smooth scrolling would queue up behind every frame of a streaming reply.
      messagesEndRef.current?.scrollIntoView({
        behavior: liveMessages.length > 0 ? "auto" : "smooth",
      });
    }
  }, [messages, liveMessages, busy]);

  function sendMessage(value = draft) {
    const text = value.trim();
    if (!text) return;
    if (!messageFitsRequest(text, toPayloads(attachments.items))) {
      attachments.reportTooBig();
      return;
    }
    sendText(text, attachments.take());
    setDraft("");
  }

  const blockedRollback = rollbackBlock(
    workingBotIds.includes(activeBot.id),
    queueCount,
  );

  /** Cuts the thread before a user message and puts its text back to edit. */
  function rollBack(messageId: number) {
    if (blockedRollback) return;
    const result = rollBackThread(messages, messageId);
    if (!result) return;
    persistMessages(result.messages);
    setDraft(result.text);
    focusComposer(language);
  }

  function startNewChat() {
    resetConversation();
    setDraft("");
    attachments.clear();
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
        workingBotIds={workingBotIds}
        attentionCounts={attentionCounts}
        onReorderBot={reorderBot}
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
          contextUsage={contextUsage}
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
        <BotsSyncNotice
          language={language}
          error={syncError}
          onDismiss={dismissSyncError}
        />
        <ConversationsSyncNotice
          language={language}
          error={conversationsSync.syncError}
          onDismiss={conversationsSync.dismissSyncError}
        />
        <SettingsSyncNotice
          language={language}
          error={settingsSync.syncError}
          onDismiss={settingsSync.dismissSyncError}
        />
        <MemorySyncNotice language={language} />
        <UsageSyncNotice
          language={language}
          error={usageSync.syncError}
          onDismiss={usageSync.dismissSyncError}
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
            attachments={attachments}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onDraftChange={setDraft}
            onSend={() => void sendMessage()}
            onSelectPrompt={(prompt) => void sendMessage(prompt)}
          />
        ) : (
          <ConversationView
            language={language}
            messages={messages}
            liveMessages={liveMessages}
            activeBot={activeBot}
            busy={busy}
            thinkingBot={workingBot ?? activeBot}
            draft={draft}
            queueCount={queueCount}
            isConfigured={isConfigured}
            activeBotSkills={activeBotSkills}
            bots={bots}
            attachments={attachments}
            messagesEndRef={messagesEndRef}
            onDraftChange={setDraft}
            onSend={() => void sendMessage()}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onCancel={cancelTurn}
            onRetry={retryMessage}
            rollbackBlocked={blockedRollback}
            onRollBack={rollBack}
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
