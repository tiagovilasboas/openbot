"use client";

import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { resetConnectFlow } from "../client/index.ts";
import { findConnection } from "./connection-catalog.ts";
import { getConnectionsCopy } from "./connections-copy.ts";
import { describeConnectState } from "./describe-connect-state.ts";
import { useConnectFlow } from "./use-connect-flow.ts";

const TONE_CLASS = {
  progress: "border-border bg-surface text-foreground",
  success: "border-success text-foreground",
  error: "border-danger text-danger",
} as const;

/** The outcome of a Connect, announced politely to assistive technology. */
export function ConnectNotice({ language }: { language: ChatLanguage }) {
  const { id, state } = useConnectFlow();
  const c = getConnectionsCopy(language);
  const view = id
    ? describeConnectState(state, findConnection(id).name, language)
    : null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {view && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${TONE_CLASS[view.tone]}`}
        >
          <p>{view.message}</p>
          {view.dismissible && (
            <button
              type="button"
              onClick={resetConnectFlow}
              className="min-h-11 shrink-0 rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
            >
              {c.dismiss}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
