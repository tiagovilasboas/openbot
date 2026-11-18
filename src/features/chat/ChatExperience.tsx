"use client";

import { useCallback, useState } from "react";
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
import { BotModelNotice } from "@/features/bots/BotModelNotice.tsx";
import { BotModelPicker } from "@/features/bots/BotModelPicker.tsx";
import { getBotModelPickerCopy } from "@/features/bots/bot-model-picker-copy.ts";
import { ChatDialogs } from "./ChatDialogs.tsx";
import { ChatConversationPane } from "./ChatConversationPane.tsx";
import { ChatHeader } from "./ChatHeader.tsx";
import { ChatSidebar } from "./ChatSidebar.tsx";
import { ChatSyncNotices } from "./ChatSyncNotices.tsx";
import { NewChatUndoNotice } from "./NewChatUndoNotice.tsx";
import { rollbackBlock } from "./roll-back-thread.ts";
import { useActiveModel } from "./use-active-model.ts";
import { useBotEditor } from "./use-bot-editor.ts";
import { useBotMessages } from "./use-bot-messages.ts";
import { useComposerDraft } from "./use-composer-draft.ts";
import { useChatModelPicker } from "./use-chat-model-picker.ts";
import { useChatTurns } from "./use-chat-turns.ts";
import { useDocumentTheme } from "./use-document-theme.ts";
import { useLanguage } from "./use-language.ts";
import { useMessageQueue } from "./use-message-queue.ts";
import { useAgentShortcuts } from "./use-agent-shortcuts.ts";
import { useNewChatUndo } from "./use-new-chat-undo.ts";
import { ThreadBar } from "../threads/ThreadBar.tsx";
import { useBotThreads } from "../threads/use-bot-threads.ts";

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

  // Sidebar & Modals state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const botEditor = useBotEditor();
  const mentionableBots = visibleBots(bots);

  const modelConfig = useModelConfig();
  const gitHubToken = useGitHubToken();

  useDocumentTheme(language, activeBot);
  const {
    serverModel,
    isConfigured,
    modelStatus,
    recordModelCall,
    activeModelLabel,
  } = useActiveModel(modelConfig, language);
  const gate = useConnectGate(language, isConfigured, serverModel !== null);
  useMigrateLocalKeys();
  useAgentShortcuts({
    language,
    bots,
    locked: gate.locked,
    onSelect: (id) => {
      clearQueue();
      setActiveBotId(id);
    },
  });
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
  const { modelPicker, headerModelLabel, composerModel } = useChatModelPicker({
    language,
    activeBot,
    saveBot: botsState.saveBot,
    turnModel,
    isConfigured,
    activeModelLabel,
    provider: modelConfig?.provider ?? serverModel?.provider,
    onOpenSettings: () => setIsSettingsOpen(true),
  });

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

  const threadList = useBotThreads(activeBot.id, language);
  const threadsLocked = blockedRollback !== null;

  const newChatUndo = useNewChatUndo({
    language,
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
        <ThreadBar
          language={language}
          threads={threadList.threads}
          activeId={threadList.activeId}
          locked={threadsLocked}
          removed={threadList.removed}
          onSelect={threadList.select}
          onCreate={threadList.create}
          onRename={threadList.rename}
          onRemove={threadList.remove}
          onUndoRemove={threadList.undoRemove}
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

        <ChatConversationPane
          language={language}
          messages={messages}
          liveMessages={liveMessages}
          activeBot={activeBot}
          workingBot={workingBot}
          mainBotId={mainBotId}
          busy={busy}
          draft={draft}
          queueCount={queueCount}
          isConfigured={isConfigured}
          activeBotSkills={activeBot.skills}
          mentionableBots={mentionableBots}
          attachments={attachments}
          composerModel={composerModel}
          locked={gate.locked}
          composerLockedReason={gate.composerReason}
          connectChecking={gate.checking}
          rollbackBlocked={blockedRollback}
          toolTurn={toolTurn}
          onDraftChange={setDraft}
          onSend={sendMessage}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCancel={cancelTurn}
          onRetry={retryMessage}
          onRollBack={rollBack}
          branch={{
            running: threadsLocked,
            onBranch: (id) => threadList.branchFrom(id, threadsLocked),
          }}
        />
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
