"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnectReturn } from "@/features/connections/index.ts";
import { useConnectGate } from "@/features/onboarding/use-connect-gate.ts";
import { consumeFirstRunConnect } from "@/features/onboarding/first-run-return.ts";
import { useComposerAttachments } from "@/features/attachments/use-composer-attachments.ts";
import { useAttention } from "@/features/attention/use-attention.ts";
import { LockScreen } from "@/features/auth/LockScreen.tsx";
import { useLocalAuth } from "@/features/auth/use-local-auth.ts";
import { useConversationsSync } from "@/features/conversations/sync/use-conversations-sync.ts";
import { useSettingsSync } from "@/features/settings/sync/use-settings-sync.ts";
import { useUsageSync } from "@/features/usage/sync/use-usage-sync.ts";
import { visibleBots } from "@/features/bots/bot-visibility.ts";
import { useBots } from "@/features/bots/use-bots.ts";
import { useGitHubToken } from "@/features/github/use-github-token.ts";
import { useContextUsage } from "@/features/context-window/use-context-usage.ts";
import { useModelConfig } from "@/features/model/use-model-config.ts";
import { useMigrateLocalKeys } from "@/features/key-vault/use-migrate-local-keys.ts";
import { botModelBadge } from "@/features/bots/bot-model-badge.ts";
import { BotModelNotice } from "@/features/bots/BotModelNotice.tsx";
import { BotModelPicker } from "@/features/bots/BotModelPicker.tsx";
import { getBotModelPickerCopy } from "@/features/bots/bot-model-picker-copy.ts";
import { fillCopy } from "@/features/model/settings-copy.ts";
import { ComposerModelProvider } from "@/features/bots/composer-model-context.ts";
import { composerModelChip } from "@/features/bots/composer-model-chip.ts";
import { useBotModelPicker } from "@/features/bots/use-bot-model-picker.ts";
import { ChatDialogs } from "./ChatDialogs.tsx";
import { ChatEmptyState } from "./ChatEmptyState.tsx";
import { ChatHeader } from "./ChatHeader.tsx";
import { ChatSidebar } from "./ChatSidebar.tsx";
import { ChatSyncNotices } from "./ChatSyncNotices.tsx";
import { ConversationView } from "./ConversationView.tsx";
import { NewChatUndoNotice } from "./NewChatUndoNotice.tsx";
import { rollbackBlock } from "./roll-back-thread.ts";
import { useActiveModel } from "./use-active-model.ts";
import { useBotEditor } from "./use-bot-editor.ts";
import { useBotMessages } from "./use-bot-messages.ts";
import { useComposerDraft } from "./use-composer-draft.ts";
import { useChatTurns } from "./use-chat-turns.ts";
import { useDocumentTheme } from "./use-document-theme.ts";
import { useLanguage } from "./use-language.ts";
import { useMessageQueue } from "./use-message-queue.ts";
import { useNewChatUndo } from "./use-new-chat-undo.ts";

export function ChatExperience() {
  const [language, setLanguage] = useLanguage();
  const attachments = useComposerAttachments();
  const auth = useLocalAuth();
  const { queueCount, enqueue, dequeue, clearQueue } = useMessageQueue();

  // Dots / Grok Bot systems
  const botsState = useBots();
  const {
    bots,
    activeBot,
    activeBotId,
    setActiveBotId,
    restoreBot,
    reorderBot,
    mainBotId,
    syncError,
    dismissSyncError,
  } = botsState;
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
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const botEditor = useBotEditor();
  const mentionableBots = visibleBots(bots);

  const modelConfig = useModelConfig();
  const gitHubToken = useGitHubToken();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useDocumentTheme(language, activeBot);
  const {
    serverModel,
    isConfigured,
    modelStatus,
    recordModelCall,
    activeModelLabel,
  } = useActiveModel(modelConfig, language);
  const gate = useConnectGate(language, isConfigured, serverModel !== null);
  const savedModelLabel = botModelBadge(
    activeModelLabel,
    modelConfig?.provider ?? serverModel?.provider,
    activeBot.modelId,
    language,
  );
  useMigrateLocalKeys();
  // A provider sending the browser back to finish a Connect opens Settings.
  // (One started from the first-run card returns to the chat instead.)
  useConnectReturn(
    useCallback(() => {
      if (!consumeFirstRunConnect()) setIsSettingsOpen(true);
    }, []),
  );

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
    turnModel,
    sendText,
    cancelTurn,
    retryMessage,
    resetConversation,
    toolTurn,
  } = useChatTurns({
    language,
    activeBot,
    bots,
    mainBotId,
    gitHubToken,
    modelConfig,
    contextModel: modelConfig?.model ?? serverModel?.model,
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
  const modelPicker = useBotModelPicker(
    activeBot,
    language,
    botsState.saveBot,
    turnModel,
  );
  const headerModelLabel = modelPicker.pending
    ? fillCopy(getBotModelPickerCopy(language).nextBadge, {
        model: savedModelLabel,
      })
    : savedModelLabel;

  const composerModel = {
    chip: composerModelChip(isConfigured, headerModelLabel, language),
    onPress: isConfigured ? modelPicker.open : () => setIsSettingsOpen(true),
  };

  useEffect(() => {
    if (messages.length > 0) {
      // Smooth scrolling would queue up behind every frame of a streaming reply.
      messagesEndRef.current?.scrollIntoView({
        behavior: liveMessages.length > 0 ? "auto" : "smooth",
      });
    }
  }, [messages, liveMessages, busy]);

  const blockedRollback = rollbackBlock(
    workingBotIds.includes(activeBot.id),
    queueCount,
  );

  const { draft, setDraft, sendMessage, rollBack, clearThread } =
    useComposerDraft({
      language,
      locked: gate.locked,
      attachments,
      messages,
      persistMessages,
      blockedRollback,
      sendText,
      resetConversation,
    });

  const newChatUndo = useNewChatUndo({
    botId: activeBot.id,
    messages,
    persistMessages,
    startNewChat: clearThread,
  });

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
        approvalBotId={toolTurn.paused?.botId}
        onReorderBot={reorderBot}
        isMobileOpen={isMobileSidebarOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        hasPassword={auth.hasPassword}
        onLock={auth.lock}
        onToggleDesktopCollapse={() => setIsDesktopCollapsed((v) => !v)}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        agentsLockedReason={gate.agentsReason}
        onSelectBot={(id) => {
          if (gate.locked) return;
          clearQueue();
          setActiveBotId(id);
        }}
        onCreateBot={gate.locked ? openSettings : botEditor.openNew}
        onEditBot={botEditor.openFor}
        onRestoreBot={restoreBot}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewChat={newChatUndo.newChatWithUndo}
        canStartNewChat={messages.length > 0}
      />

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <ChatHeader
          language={language}
          onLanguageChange={setLanguage}
          activeModelLabel={headerModelLabel}
          modelStatus={modelStatus}
          contextUsage={contextUsage}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenModelPicker={modelPicker.open}
          modelPickerLabel={getBotModelPickerCopy(language).pickerButton}
          hasMessages={messages.length > 0}
          onNewChat={newChatUndo.newChatWithUndo}
          activeBot={activeBot}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onOpenBotEdit={() => botEditor.openFor(activeBot)}
        />
        <BotModelNotice message={modelPicker.notice} />
        <BotModelPicker
          isOpen={modelPicker.isOpen}
          language={language}
          modelId={activeBot.modelId}
          onChoose={modelPicker.choose}
          onClose={modelPicker.close}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <ChatSyncNotices
          language={language}
          bots={{ syncError, dismissSyncError }}
          conversations={conversationsSync}
          settings={settingsSync}
          usage={usageSync}
        />

        <ComposerModelProvider value={composerModel}>
          {messages.length === 0 || gate.locked ? (
            <ChatEmptyState
              language={language}
              draft={draft}
              busy={busy}
              skills={activeBotSkills}
              bots={mentionableBots}
              activeBot={activeBot}
              mainBotId={mainBotId}
              isConfigured={isConfigured}
              composerLockedReason={gate.composerReason}
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
              bots={mentionableBots}
              attachments={attachments}
              messagesEndRef={messagesEndRef}
              onDraftChange={setDraft}
              onSend={() => void sendMessage()}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onCancel={cancelTurn}
              onRetry={retryMessage}
              rollbackBlocked={blockedRollback}
              onRollBack={rollBack}
              toolTurn={toolTurn}
            />
          )}
        </ComposerModelProvider>
      </main>

      <NewChatUndoNotice
        language={language}
        visible={newChatUndo.canUndo}
        onUndo={newChatUndo.undo}
      />

      <ChatDialogs
        language={language}
        onLanguageChange={setLanguage}
        isSettingsOpen={isSettingsOpen}
        onCloseSettings={() => setIsSettingsOpen(false)}
        modelConfig={modelConfig}
        auth={auth}
        bots={botsState}
        botEditor={botEditor}
      />
    </div>
  );
}
