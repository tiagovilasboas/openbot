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
  /** Runs just before the browser leaves for the provider's page. */
  onBegin?: () => void;
}

/** One provider's connect form (sign in or paste a key) for use outside Settings. */
export function ConnectProvider({
  id,
  language,
  onBack,
  onBegin,
}: ConnectProviderProps) {
  const s = getSettingsCopy(language);
  const { keys } = useSavedKeys();
  return (
    <ConnectionDetail
      entry={findConnection(id)}
      language={language}
      savedToken={null}
      isSaved={id !== "github" && Boolean(keys[id])}
      showSecretLabel={s.showSecret}
      hideSecretLabel={s.hideSecret}
      onBack={onBack}
      onBegin={onBegin}
    />
  );
}
