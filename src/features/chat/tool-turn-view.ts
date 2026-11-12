import type { LiveToolStep } from "../tools/client/live-tool-steps.ts";
import type { DecisionChoice } from "../tools/client/paused-turn.ts";
import type { PausedToolTurn } from "./use-tool-approval.ts";

/** What the conversation shows of the tool turn: its pause, steps, notice. */
export type ToolTurnView = {
  /** A turn waiting for the user's approval. */
  paused: PausedToolTurn | null;
  /** The stored message a resume is continuing; hidden while it streams. */
  resumingId: number | null;
  /** The calls of the turn in flight. */
  steps: LiveToolStep[];
  /** The bot whose last turn ran without tools (the model takes none). */
  unavailableBotId: string | null;
  onDecide: (choice: DecisionChoice) => void;
};
