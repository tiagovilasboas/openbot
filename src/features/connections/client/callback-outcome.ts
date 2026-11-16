import type { ConnectEvent, ConnectFailure } from "../core/index.ts";

export type CallbackOutcome =
  | { status: "connected" }
  | { status: "expired" }
  | { status: "failed"; reason: ConnectFailure };

const FAILURES: readonly ConnectFailure[] = [
  "denied",
  "invalid_key",
  "state_mismatch",
  "network",
  "unavailable",
];

function asFailure(value: unknown): ConnectFailure | null {
  return FAILURES.find((failure) => failure === value) ?? null;
}

/** Maps the callback route's answer to an outcome the state machine knows. */
export function outcomeFromResponse(
  httpStatus: number,
  body: unknown,
): CallbackOutcome {
  if (httpStatus === 200) return { status: "connected" };
  if (httpStatus === 410) return { status: "expired" };
  if (httpStatus === 502) return { status: "failed", reason: "network" };
  const fields = (body ?? {}) as { status?: unknown; reason?: unknown };
  const reason = asFailure(fields.reason) ?? asFailure(fields.status);
  return { status: "failed", reason: reason ?? "unavailable" };
}

/** The reducer events for a callback, from a settled state: start, then result. */
export function eventsForOutcome(outcome: CallbackOutcome): ConnectEvent[] {
  if (outcome.status === "expired") {
    return [{ type: "start" }, { type: "timedOut" }];
  }
  const result: ConnectEvent =
    outcome.status === "connected"
      ? { type: "succeeded", accountLabel: null }
      : { type: "failed", reason: outcome.reason };
  return [{ type: "start" }, { type: "returned" }, result];
}
