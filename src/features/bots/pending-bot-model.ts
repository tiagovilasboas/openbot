/** The model a turn in flight was started with: undefined is the global one. */
export interface InFlightTurnModel {
  botId: string;
  modelId: string | undefined;
}

/** A saved model the running turn does not use yet; undefined is the default. */
export interface PendingBotModel {
  modelId: string | undefined;
}

function normalized(modelId: string | undefined): string {
  return modelId?.trim() ?? "";
}

/**
 * The saved model of a bot is pending while a turn of that bot runs on a
 * different one: the turn keeps its model and the next one takes the saved.
 */
export function pendingBotModel(
  bot: { id: string; modelId?: string },
  turn: InFlightTurnModel | null,
): PendingBotModel | null {
  if (!turn || turn.botId !== bot.id) return null;
  if (normalized(turn.modelId) === normalized(bot.modelId)) return null;
  return { modelId: bot.modelId?.trim() || undefined };
}
