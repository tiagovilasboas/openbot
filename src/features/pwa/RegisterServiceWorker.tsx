"use client";

import { useLanguage } from "../chat/use-language.ts";
import { getSwUpdateCopy } from "./sw-update-copy.ts";
import { useServiceWorkerUpdate } from "./use-sw-update.ts";

/** Registers the worker and, when a new build waits, offers to switch to it. */
export function RegisterServiceWorker() {
  const [language] = useLanguage();
  const { updateReady, update } = useServiceWorkerUpdate();
  if (!updateReady) return null;
  const copy = getSwUpdateCopy(language);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(var(--safe-top,0px),1rem)] z-50 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex animate-enter items-center gap-1 rounded-full border border-border bg-surface py-1 pr-1 pl-5 shadow-lg motion-reduce:animate-none">
        <span className="text-[15px] text-foreground md:text-sm">
          {copy.message}
        </span>
        <button
          type="button"
          onClick={update}
          className="min-h-11 rounded-full px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-secondary active:scale-[0.97] md:text-sm"
        >
          {copy.update}
        </button>
      </div>
    </div>
  );
}
