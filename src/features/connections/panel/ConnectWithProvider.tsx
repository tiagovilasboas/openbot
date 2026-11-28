"use client";

import { useSyncExternalStore } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { fillCopy } from "@/features/model/settings-copy.ts";
import { dispatchConnect, startConnect } from "../client/index.ts";
import {
  connectionMethods,
  connectRoute,
  isInFlight,
  type ConnectionId,
} from "../core/index.ts";
import { getConnectionsCopy } from "./connections-copy.ts";
import { useConnectFlow } from "./use-connect-flow.ts";

interface ConnectWithProviderProps {
  id: ConnectionId;
  name: string;
  language: ChatLanguage;
  needsReauth?: boolean;
  /** Runs just before the browser leaves for the provider's page. */
  onBegin?: () => void;
}

/** Whether this origin can take the provider's redirect back. After mount only. */
function useOAuthRoute(id: ConnectionId): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => connectRoute(id, window.location.origin).connect === "oauth",
    () => false,
  );
}

function subscribeNever(): () => void {
  return () => {};
}

/** "Connect with X": opens the provider's page; the paste-key form is the other way. */
export function ConnectWithProvider({
  id,
  name,
  language,
  needsReauth = false,
  onBegin,
}: ConnectWithProviderProps) {
  const c = getConnectionsCopy(language);
  const isOAuth = useOAuthRoute(id);
  const flow = useConnectFlow();
  const isBusy = flow.id === id && isInFlight(flow.state);
  const methods = connectionMethods(id);

  if (!isOAuth) {
    if (methods.preferred === "oauth" && methods.alternative === null) {
      return (
        <p className="rounded-xl bg-surface px-3 py-2 text-xs text-subtle md:text-[13px]">
          {c.oauthLoopbackOnly}
        </p>
      );
    }
    return null;
  }

  async function begin() {
    dispatchConnect(id, { type: "start" });
    const started = await startConnect(id);
    if (!started.ok) {
      dispatchConnect(id, { type: "failed", reason: started.reason });
      return;
    }
    dispatchConnect(id, { type: "opened" });
    onBegin?.();
    window.location.assign(started.authorizeUrl);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={isBusy}
        aria-busy={isBusy}
        onClick={() => void begin()}
        className="min-h-10 w-full rounded-full bg-bot-accent px-5 text-sm font-medium text-white transition-opacity active:scale-[0.97] disabled:opacity-60"
      >
        {fillCopy(needsReauth ? c.reconnectWith : c.connectWith, { name })}
      </button>
      {methods.alternative === "api-key" && (
        <p className="text-center text-xs text-subtle md:text-[13px]">
          {c.orPasteKey}
        </p>
      )}
    </div>
  );
}
