"use client";

import type { Language } from "../language/language.ts";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { ConnectWithProvider } from "@/features/connections/index.ts";
import { useSavedKeys } from "@/features/key-vault/use-saved-keys.ts";
import { describeOpenRouterAccess } from "./openrouter-access.ts";
import { getSettingsCopy } from "./settings-copy.ts";

interface OpenRouterAccessProps {
  language: ChatLanguage;
  content: (typeof chatCopy)[Language];
}

/** How the OpenRouter preset gets its key: already connected, or connect / paste one. */
export function OpenRouterAccess({ language, content }: OpenRouterAccessProps) {
  const s = getSettingsCopy(language);
  const { keys } = useSavedKeys();

  if (describeOpenRouterAccess(Boolean(keys.router)) === "connected") {
    return (
      <p
        role="status"
        className="text-xs font-medium text-success md:text-[13px]"
      >
        {s.openRouterConnected}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ConnectWithProvider id="router" name="OpenRouter" language={language} />
      <p className="text-xs text-subtle md:text-[13px]">
        {content.presetOpenRouterHint}{" "}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noreferrer"
          className="text-bot-accent underline underline-offset-2"
        >
          {s.getKey}
        </a>
      </p>
    </div>
  );
}
