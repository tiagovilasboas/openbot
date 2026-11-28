"use client";

import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { useSavedKeys } from "@/features/key-vault/use-saved-keys.ts";
import { getSettingsCopy } from "@/features/model/settings-copy.ts";
import type { ConnectionId } from "../core/index.ts";
import { findConnection } from "./connection-catalog.ts";
import { ConnectionDetail } from "./ConnectionDetail.tsx";

interface ConnectProviderProps {
  id: ConnectionId;
  language: ChatLanguage;
  /** Leaves the connect form without connecting. */
  onBack: () => void;
  /** Overrides the Back label where it leads somewhere other than the list. */
  backLabel?: string;
  /** Runs just before the browser leaves for the provider's page. */
  onBegin?: () => void;
}

/** One provider's connect form (sign in or paste a key) for use outside Settings. */
export function ConnectProvider({
  id,
  language,
  onBack,
  backLabel,
  onBegin,
}: ConnectProviderProps) {
  const s = getSettingsCopy(language);
  const { keys, oauthSessions } = useSavedKeys();
  const isSaved =
    id === "router" || id === "anthropic"
      ? Boolean(keys[id])
      : id === "chatgpt"
        ? Boolean(oauthSessions.chatgpt)
        : false;
  return (
    <ConnectionDetail
      entry={findConnection(id)}
      language={language}
      savedToken={null}
      isSaved={isSaved}
      showSecretLabel={s.showSecret}
      hideSecretLabel={s.hideSecret}
      onBack={onBack}
      backLabel={backLabel}
      onBegin={onBegin}
    />
  );
}
