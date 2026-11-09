/** Why the guard refused a request, with the HTTP status that goes with it. */
export type GuardRefusal = {
  ok: false;
  status: 401 | 403 | 413 | 429;
  error:
    | "unauthorized"
    | "forbidden_origin"
    | "missing_client_header"
    | "payload_too_large"
    | "rate_limited";
  /** Seconds the caller should wait; only set for rate limiting. */
  retryAfterSeconds?: number;
};

export type GuardDecision = { ok: true } | GuardRefusal;

/** Header every first-party fetch to /api/* carries. */
export const CLIENT_HEADER = "x-openbot-client";
export const CLIENT_HEADER_VALUE = "1";
