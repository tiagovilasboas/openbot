import { applyToolEvent, type LiveToolStep } from "./live-tool-steps.ts";
import type { ToolProgressEvent } from "./tool-stream-events.ts";

export type ToolTurnLog = {
  /** Feeds one tool event of the stream. */
  hear(event: ToolProgressEvent): void;
  steps(): LiveToolStep[];
  /** The model took no tools: the turn ran as plain chat. */
  unavailable(): boolean;
};

/**
 * What one tool turn did, as its events arrive. A memory change makes the
 * client take the server's copy of the bot's notes; a throw there never
 * breaks the turn.
 */
export function createToolTurnLog({
  botId,
  initial = [],
  onMemoryChanged,
  onSteps,
}: {
  botId: string;
  initial?: readonly LiveToolStep[];
  onMemoryChanged: (botId: string) => void;
  onSteps?: (steps: LiveToolStep[]) => void;
}): ToolTurnLog {
  let steps: LiveToolStep[] = [...initial];
  let unavailable = false;
  return {
    hear(event) {
      if (event.type === "memory_changed") {
        try {
          onMemoryChanged(botId);
        } catch {
          // The notes catch up on the next load.
        }
        return;
      }
      if (event.type === "tools_unavailable") {
        unavailable = true;
        return;
      }
      steps = applyToolEvent(steps, event);
      onSteps?.(steps);
    },
    steps: () => steps,
    unavailable: () => unavailable,
  };
}
