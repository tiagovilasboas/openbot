import type { DatabaseSync } from "node:sqlite";
import { saveApproval } from "./channel-approvals-repository.ts";
import {
  appendMessage,
  finishTurn,
  isTurnOver,
  setSpeaking,
} from "./channel-messages-repository.ts";
import type { GroupTurnDeps, GroupTurnState } from "./group-speakers.ts";

/** Ties a group turn to the channel's storage: messages, speaker, pauses. */
export function groupTurnDeps(
  db: DatabaseSync,
  channelId: string,
  turnId: number,
  parentSeq: number | undefined,
  now: () => number,
): GroupTurnDeps {
  return {
    append: (author, text) =>
      appendMessage(db, channelId, author, text, now(), parentSeq),
    isOver: () => isTurnOver(db, turnId),
    setSpeaking: (botId) => setSpeaking(db, turnId, botId),
    pause: ({ botId, pause, remaining }) =>
      saveApproval(db, {
        turnId: pause.turnId,
        channelId,
        groupTurnId: turnId,
        botId,
        parentSeq: parentSeq ?? null,
        remaining,
        calls: pause.calls,
        expiresAt: pause.expiresAt,
      }),
  };
}

/**
 * Closes the group turn when its work ends. A paused turn stays running: it
 * waits for the person, and a new post or Stop ends it like any live turn.
 */
export function settleGroupTurn(
  db: DatabaseSync,
  turnId: number,
  work: Promise<GroupTurnState>,
  now: () => number,
): Promise<void> {
  return work.then(
    (state) => {
      if (state === "done") finishTurn(db, turnId, "completed", now());
    },
    () => finishTurn(db, turnId, "failed", now()),
  );
}
