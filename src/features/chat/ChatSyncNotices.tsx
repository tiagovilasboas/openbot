import type { ComponentProps } from "react";
import { BotsSyncNotice } from "@/features/bots/sync/BotsSyncNotice.tsx";
import { ConversationsSyncNotice } from "@/features/conversations/sync/ConversationsSyncNotice.tsx";
import { MemorySyncNotice } from "@/features/memory/sync/MemorySyncNotice.tsx";
import { SettingsSyncNotice } from "@/features/settings/sync/SettingsSyncNotice.tsx";
import { UsageSyncNotice } from "@/features/usage/sync/UsageSyncNotice.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";

type SyncState<Error> = { syncError: Error; dismissSyncError: () => void };

/** The banners that tell the user a sync with the server failed. */
export function ChatSyncNotices({
  language,
  bots,
  conversations,
  settings,
  usage,
}: {
  language: ChatLanguage;
  bots: SyncState<ComponentProps<typeof BotsSyncNotice>["error"]>;
  conversations: SyncState<
    ComponentProps<typeof ConversationsSyncNotice>["error"]
  >;
  settings: SyncState<ComponentProps<typeof SettingsSyncNotice>["error"]>;
  usage: SyncState<ComponentProps<typeof UsageSyncNotice>["error"]>;
}) {
  return (
    <>
      <BotsSyncNotice
        language={language}
        error={bots.syncError}
        onDismiss={bots.dismissSyncError}
      />
      <ConversationsSyncNotice
        language={language}
        error={conversations.syncError}
        onDismiss={conversations.dismissSyncError}
      />
      <SettingsSyncNotice
        language={language}
        error={settings.syncError}
        onDismiss={settings.dismissSyncError}
      />
      <MemorySyncNotice language={language} />
      <UsageSyncNotice
        language={language}
        error={usage.syncError}
        onDismiss={usage.dismissSyncError}
      />
    </>
  );
}
