"use client";

import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { AlertIcon } from "@/shared/ui/FieldIcons.tsx";
import { fillCopy, getSettingsCopy } from "./settings-copy.ts";

interface MissingKeyNoticeProps {
  provider: string;
  language: ChatLanguage;
  onConnect?: () => void;
}

/** Says the provider has no key yet and leads to the Connections tab. */
export function MissingKeyNotice({
  provider,
  language,
  onConnect,
}: MissingKeyNoticeProps) {
  const s = getSettingsCopy(language);
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl bg-warning-soft py-1.5 pe-1.5 ps-3 text-warning"
    >
      <AlertIcon className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-[13px]">
        {fillCopy(s.keyMissing, { provider })}
      </p>
      {onConnect && (
        <button
          type="button"
          onClick={onConnect}
          className="min-h-11 shrink-0 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background active:scale-[0.97]"
        >
          {s.connectAction}
        </button>
      )}
    </div>
  );
}
