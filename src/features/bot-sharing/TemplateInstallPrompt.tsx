"use client";

import { useEffect, useState } from "react";
import { BotAvatar } from "../bots/BotAvatar.tsx";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { ResponsiveSheet } from "@/shared/ui/ResponsiveSheet.tsx";
import type { BotTemplateDraft } from "./bot-template-file-types.ts";
import { readInstallFragment } from "./install-link.ts";
import { getInstallLinkCopy } from "./install-link-copy.ts";
import { parseBotTemplateFile } from "./parse-bot-template-file.ts";

type Found =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "draft"; draft: BotTemplateDraft };

/** Drops the fragment so a reload does not offer the bot again. */
function clearFragment() {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
}

function readLocation(): Found {
  const text = readInstallFragment(window.location.hash);
  if (text === null) {
    return window.location.hash.startsWith("#install=")
      ? { kind: "invalid" }
      : { kind: "none" };
  }
  const parsed = parseBotTemplateFile(text);
  return parsed.ok
    ? { kind: "draft", draft: parsed.draft }
    : { kind: "invalid" };
}

/**
 * Opens when the app loads from an install link: shows the bot as a card
 * and installs it only on the user's confirmation.
 */
export function TemplateInstallPrompt({
  language,
  onInstall,
}: {
  language: ChatLanguage;
  onInstall: (draft: BotTemplateDraft) => void;
}) {
  const copy = getInstallLinkCopy(language);
  const [found, setFound] = useState<Found>({ kind: "none" });

  useEffect(() => {
    const check = () => setFound(readLocation());
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  function close() {
    clearFragment();
    setFound({ kind: "none" });
  }

  const draft = found.kind === "draft" ? found.draft : null;
  return (
    <ResponsiveSheet
      isOpen={found.kind !== "none"}
      onClose={close}
      title={copy.title}
      description={copy.description}
      size="md"
      closeLabel={copy.cancel}
    >
      {!draft ? (
        <p role="alert" className="text-[13px] text-danger">
          {copy.invalid}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <BotAvatar
              shape={draft.avatarShape}
              color={draft.avatarColor}
              size="48px"
            />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold text-foreground">
                {draft.name}
              </p>
              <p className="truncate text-[13px] text-muted">
                {[draft.title, copy.skills(draft.skills.length)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">
              {copy.instructions}
            </p>
            <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface px-3 py-2 text-[13px] text-foreground">
              {draft.description}
            </p>
          </div>
          <p
            role="status"
            className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-xs font-medium text-foreground md:text-[13px]"
          >
            {copy.warning}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-full px-4 text-sm font-medium text-muted hover:text-foreground"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                onInstall(draft);
                close();
              }}
              className="min-h-11 rounded-full bg-foreground px-4 text-sm font-semibold text-background"
            >
              {copy.install}
            </button>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}
