"use client";

import { useRef, useState, type RefObject } from "react";
import { refreshMemoryFromServer } from "@/features/memory/sync/browser-memory-sync.ts";
import type { ModelCallResult } from "@/features/model/model-status.ts";
import type { LiveToolStep } from "@/features/tools/client/live-tool-steps.ts";
import {
  decisionsFor,
  pauseExpired,
  resumeRequestFor,
  type DecisionChoice,
  type PausedTurn,
} from "@/features/tools/client/paused-turn.ts";
import { createLiveBoard, type LiveEntry } from "./live-board.ts";
import type { ChatLanguage } from "./respond-to-message.ts";
import { settleToolReply } from "./tool-reply-message.ts";
import {
  expiredToolReply,
  streamToolTurn,
  type StreamRequest,
  type ToolPauseDraft,
  type ToolTurnReply,
} from "./tool-turn-reply.ts";
import { loadBotMessages, saveBotMessages } from "./use-bot-messages.ts";

/** A turn in flight, as the chat turns hook runs it. */
export type TurnHandle = {
  signal: AbortSignal;
  live: (entries: LiveEntry[]) => void;
  steps: (steps: LiveToolStep[]) => void;
  end: () => void;
};

interface ToolApprovalInput {
  language: ChatLanguage;
  conversationIdRef: RefObject<number>;
  beginTurn: (botId: string) => TurnHandle;
  /** The resumed turn is over: free the composer and run the queue. */
  settleTurn: (botId: string, conversationId: number) => void;
  recordModelCall: (result?: ModelCallResult) => void;
}

export type PausedToolTurn = PausedTurn<StreamRequest>;

/**
 * The tool turn waiting for the user, and its resume. The resume re-sends
 * exactly the request that paused, with one decision per waiting call; a
 * pause that expired or that the server refuses stays readable, its waiting
 * calls marked expired.
 */
export function useToolApproval(input: ToolApprovalInput) {
  const { language, conversationIdRef } = input;
  const [paused, setPaused] = useState<PausedToolTurn | null>(null);
  const [resumingId, setResumingId] = useState<number | null>(null);
  // Decisions read the latest pause, not a render's copy of it.
  const pausedRef = useRef<PausedToolTurn | null>(null);
  const setPause = (next: PausedToolTurn | null) => {
    pausedRef.current = next;
    setPaused(next);
  };

  const store = (turn: PausedToolTurn, reply: ToolTurnReply) =>
    saveBotMessages(
      turn.botId,
      settleToolReply(loadBotMessages(turn.botId), turn.messageId, reply),
    );

  /** Keeps a pause the turn just stored as message `messageId`. */
  function hold(draft: ToolPauseDraft, messageId: number) {
    setPause({ ...draft, messageId });
  }

  /** Gives up the pause (a new message expires it on the server too). */
  function drop() {
    const current = pausedRef.current;
    if (!current) return;
    setPause(null);
    store(current, expiredToolReply(current, language));
  }

  async function decide(choice: DecisionChoice): Promise<void> {
    const current = pausedRef.current;
    if (!current) return;
    setPause(null);
    if (pauseExpired(current, Date.now())) {
      store(current, expiredToolReply(current, language));
      return;
    }
    const conversationId = conversationIdRef.current;
    const turn = input.beginTurn(current.botId);
    setResumingId(current.messageId);
    const board = createLiveBoard(turn.live);
    const result = await streamToolTurn({
      request: current.request,
      tools: resumeRequestFor(current, decisionsFor(current.pause, choice)),
      prior: { text: current.text, steps: current.steps },
      signal: turn.signal,
      show: board.stream(),
      onMemoryChanged: (botId) => void refreshMemoryFromServer(botId),
      onToolSteps: turn.steps,
    });
    turn.end();
    setResumingId(null);
    if (conversationIdRef.current === conversationId) {
      store(current, result.reply);
      input.recordModelCall(result.reply.modelCall);
      if (result.reply.toolPause) {
        hold(result.reply.toolPause, current.messageId);
      }
    }
    input.settleTurn(current.botId, conversationId);
  }

  return { paused, resumingId, hold, drop, decide };
}
