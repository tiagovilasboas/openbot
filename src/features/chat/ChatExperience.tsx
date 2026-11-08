"use client";

import { useEffect, useRef, useState } from "react";
import { LockScreen } from "@/features/auth/LockScreen.tsx";
import { useLocalAuth } from "@/features/auth/use-local-auth.ts";
import { BotAvatar } from "@/features/bots/BotAvatar.tsx";
import { BotEditModal } from "@/features/bots/BotEditModal.tsx";
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
import { chatCopy } from "./chat-copy.ts";
import { ChatComposer } from "./ChatComposer.tsx";
import { ChatEmptyState } from "./ChatEmptyState.tsx";
import { ChatHeader } from "./ChatHeader.tsx";
import { ChatMessageItem, type MessageData } from "./ChatMessageItem.tsx";
import { ChatSidebar } from "./ChatSidebar.tsx";
import { executeChatMessage } from "./execute-chat-message.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { useBotMessages } from "./use-bot-messages.ts";

export function ChatExperience() {
  const [language, setLanguage] = useState<ChatLanguage>("pt");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const auth = useLocalAuth();

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
  const content = chatCopy[language];

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-BR" : "en";
  }, [language]);

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

  async function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || busy) return;
    const conversationId = conversationIdRef.current;
    const history = [...messages, { role: "user" as const, text }];
    const updatedMessages: MessageData[] = [
      ...messages,
      { id: getNextId(), role: "user", language, text },
    ];
    persistMessages(updatedMessages);
    setDraft("");
    setBusy(true);

    const reply = await executeChatMessage({
      text,
      language,
      history,
      activeBot,
      allSkills,
      bots,
      gitHubToken,
      modelConfig,
    });

    if (conversationIdRef.current !== conversationId) return;
    persistMessages([
      ...updatedMessages,
      {
        id: getNextId(),
        role: "assistant",
        language,
        text: reply.text,
        delegatedBot: reply.delegatedBot,
        modelBadge: isConfigured ? activeModelLabel : undefined,
        ...(reply.github ? { github: reply.github } : {}),
      },
    ]);
    setBusy(false);
  }

  function startNewChat() {
    conversationIdRef.current += 1;
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
    <div className="dark flex h-dvh max-h-dvh w-full overflow-hidden bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white">
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
        onSelectBot={setActiveBotId}
        onCreateBot={() => {
          setBotToEdit(null);
          setIsBotModalOpen(true);
        }}
        onEditBot={(b) => {
          setBotToEdit(b);
          setIsBotModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex flex-1 min-w-0 flex-col h-full overflow-hidden bg-black">
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
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 sm:px-6">
              <section
                aria-label={content.conversationLabel}
                aria-live="polite"
                className="flex w-full flex-col gap-5"
              >
                {messages.map((message) => (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    activeBot={activeBot}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                  />
                ))}
                {busy && (
                  <div
                    className="flex w-full items-center gap-3 pt-1 animate-in fade-in duration-200"
                    role="status"
                  >
                    <BotAvatar
                      shape={activeBot.avatarShape}
                      color={activeBot.avatarColor}
                      size={28}
                      className="animate-pulse"
                    />
                    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1.5 shadow-sm">
                      <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce" />
                      <span className="sr-only">{content.thinking}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </section>
            </div>

            <footer className="shrink-0 border-t border-white/5 bg-black/90 p-3 sm:px-6 backdrop-blur-xl">
              <div className="w-full">
                <ChatComposer
                  mode="docked"
                  language={language}
                  draft={draft}
                  busy={busy}
                  skills={activeBotSkills}
                  bots={bots}
                  onDraftChange={setDraft}
                  onSend={() => void sendMessage()}
                />
              </div>
            </footer>
          </div>
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
