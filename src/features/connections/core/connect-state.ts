/**
 * The life of one Connect, for every method, as a pure reducer. Only the
 * phase and a display label live here: a code, key or token never does.
 */

/** Why a Connect ended without a credential. */
export type ConnectFailure =
  | "denied" // the user declined on the provider's page
  | "invalid_key" // the provider refused the key or the exchanged code
  | "state_mismatch" // the callback did not belong to a Connect we started
  | "network" // the provider could not be reached
  | "unavailable"; // the credential could not be stored

export type ConnectState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "waiting" } // the user is on the provider's sign-in page
  | { phase: "verifying" } // exchanging the code, or checking a pasted key
  | { phase: "connected"; accountLabel: string | null }
  | { phase: "expired" }
  | { phase: "failed"; reason: ConnectFailure };

export type ConnectEvent =
  | { type: "start" }
  | { type: "opened" }
  | { type: "returned" }
  | { type: "submitKey" }
  | { type: "succeeded"; accountLabel: string | null }
  | { type: "failed"; reason: ConnectFailure }
  | { type: "timedOut" }
  | { type: "cancel" }
  | { type: "disconnected" };

export type ConnectPhase = ConnectState["phase"];

export const IDLE: ConnectState = { phase: "idle" };

const SETTLED = new Set<ConnectPhase>([
  "idle",
  "connected",
  "expired",
  "failed",
]);
const IN_FLIGHT = new Set<ConnectPhase>(["starting", "waiting", "verifying"]);

/** Whether a Connect is running, so the surface shows progress and a cancel. */
export function isInFlight(state: ConnectState): boolean {
  return IN_FLIGHT.has(state.phase);
}

/** The next state; an event that does not fit the phase leaves it unchanged. */
export function nextConnectState(
  state: ConnectState,
  event: ConnectEvent,
): ConnectState {
  const { phase } = state;
  switch (event.type) {
    case "start":
      return SETTLED.has(phase) ? { phase: "starting" } : state;
    case "submitKey":
      return SETTLED.has(phase) ? { phase: "verifying" } : state;
    case "opened":
      return phase === "starting" ? { phase: "waiting" } : state;
    case "returned":
      return phase === "starting" || phase === "waiting"
        ? { phase: "verifying" }
        : state;
    case "succeeded":
      return phase === "verifying"
        ? { phase: "connected", accountLabel: event.accountLabel }
        : state;
    case "failed":
      return IN_FLIGHT.has(phase)
        ? { phase: "failed", reason: event.reason }
        : state;
    case "timedOut":
      return phase === "starting" || phase === "waiting"
        ? { phase: "expired" }
        : state;
    case "cancel":
      return IN_FLIGHT.has(phase) ? IDLE : state;
    case "disconnected":
      return phase === "connected" ? IDLE : state;
  }
}
