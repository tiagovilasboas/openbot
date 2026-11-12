import type { RefObject } from "react";
import type { LiveToolStep } from "../tools/client/live-tool-steps.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import { createFrameThrottle } from "./frame-throttle.ts";
import { liveMessages, type LiveEntry } from "./live-board.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/** Where a turn in flight shows itself: the hook's state setters. */
export type LiveTurnView = {
  language: ChatLanguage;
  abortRef: RefObject<AbortController | null>;
  setBusy: (busy: boolean) => void;
  setTurnBotId: (botId: string) => void;
  setLive: (messages: MessageData[]) => void;
  setToolSteps: (steps: LiveToolStep[]) => void;
};

export type LiveTurn = ReturnType<typeof startLiveTurn>;

/** Marks a turn in flight for a bot; `end` clears what it showed. */
export function startLiveTurn(view: LiveTurnView, botId: string) {
  view.setBusy(true);
  view.setTurnBotId(botId);
  const controller = new AbortController();
  view.abortRef.current = controller;
  // Deltas repaint at most once per frame; the latest entries are kept
  // aside so a cancel can store exactly what had arrived.
  let latestLive: LiveEntry[] = [];
  let turnActive = true;
  const paint = createFrameThrottle((entries: LiveEntry[]) =>
    view.setLive(liveMessages(entries, view.language)),
  );
  return {
    controller,
    signal: controller.signal,
    latest: () => latestLive,
    live(entries: LiveEntry[]) {
      // After a cancel the abandoned work may still report (a dropped
      // reply, say); what had arrived by then is what gets stored.
      if (!turnActive || controller.signal.aborted) return;
      latestLive = entries;
      paint.push(entries);
    },
    steps(next: LiveToolStep[]) {
      if (turnActive) view.setToolSteps(next);
    },
    end() {
      turnActive = false;
      paint.cancel();
      view.setLive([]);
      view.setToolSteps([]);
      if (view.abortRef.current === controller) view.abortRef.current = null;
    },
  };
}
