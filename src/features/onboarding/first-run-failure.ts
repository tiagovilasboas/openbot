/** The part of the connect flow this decision reads (structural, no import). */
interface FlowView {
  id: string | null;
  state: { phase: string };
}

/**
 * Whether the first-run card shows its "could not connect" notice: the last
 * Connect was OpenRouter, began on this card, and ended failed or expired.
 */
export function showFirstRunFailure(
  flow: FlowView,
  cameBackToFirstRun: boolean,
): boolean {
  if (!cameBackToFirstRun || flow.id !== "router") return false;
  return flow.state.phase === "failed" || flow.state.phase === "expired";
}
