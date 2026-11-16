"use client";

import { BotDeletionNotice } from "@/features/bots/BotDeletionNotice.tsx";
import { BotEditModal } from "@/features/bots/BotEditModal.tsx";
import { canHideBot } from "@/features/bots/bot-visibility.ts";
import type { useBots } from "@/features/bots/use-bots.ts";
import type { useLocalAuth } from "@/features/auth/use-local-auth.ts";
import { SettingsModal } from "@/features/model/SettingsModal.tsx";
import type { useModelConfig } from "@/features/model/use-model-config.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import type { useBotEditor } from "./use-bot-editor.ts";

type ChatDialogsProps = {
  language: ChatLanguage;
  onLanguageChange: (language: ChatLanguage) => void;
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  modelConfig: ReturnType<typeof useModelConfig>;
  auth: ReturnType<typeof useLocalAuth>;
  bots: ReturnType<typeof useBots>;
  botEditor: ReturnType<typeof useBotEditor>;
};

/** The settings modal, the bot editor and the delete-undo notice. */
export function ChatDialogs({
  language,
  onLanguageChange,
  isSettingsOpen,
  onCloseSettings,
  modelConfig,
  auth,
  bots,
  botEditor,
}: ChatDialogsProps) {
  const editing = botEditor.botToEdit;
  return (
    <>
      <SettingsModal
        isOpen={isSettingsOpen}
        language={language}
        onLanguageChange={onLanguageChange}
        currentConfig={modelConfig}
        hasPassword={auth.hasPassword}
        authHint={auth.hint}
        onClose={onCloseSettings}
        onSetupPassword={auth.setupPassword}
        onRemovePassword={auth.removePassword}
        onChangePassword={auth.changePassword}
      />

      <BotDeletionNotice
        language={language}
        botName={bots.pendingDeletedBot?.name ?? null}
        onUndo={bots.undoRemoveBot}
      />

      <BotEditModal
        isOpen={botEditor.isOpen}
        bot={editing}
        language={language}
        isMain={editing?.id === bots.mainBotId}
        canDelete={bots.bots.length > 1 && editing?.id !== bots.mainBotId}
        onClose={botEditor.close}
        onSave={(updated) =>
          editing ? bots.saveBot(updated) : bots.createAndActivateBot(updated)
        }
        canHide={canHideBot(bots.bots, editing?.id ?? "", bots.mainBotId)}
        onHide={bots.hideBot}
        onRestore={bots.restoreBot}
        onDelete={bots.removeBot}
        onMakeMain={bots.makeMainBot}
      />
    </>
  );
}
