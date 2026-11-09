import type { GuardDecision } from "./guard-types.ts";

export const MAX_BODY_BYTES = 64 * 1024;

/**
 * Refuses oversized bodies before any route reads them. The declared length
 * is enforced by the HTTP parser, so it bounds what is read. A body with no
 * declared length (chunked) cannot be bounded up front and is refused.
 */
export function checkBodySize(
  headers: Headers,
  maxBytes: number = MAX_BODY_BYTES,
): GuardDecision {
  const tooLarge: GuardDecision = {
    ok: false,
    status: 413,
    error: "payload_too_large",
  };
  const declared = headers.get("content-length");
  if (declared !== null) {
    const bytes = Number(declared);
    return Number.isFinite(bytes) && bytes >= 0 && bytes <= maxBytes
      ? { ok: true }
      : tooLarge;
  }
  return headers.has("transfer-encoding") ? tooLarge : { ok: true };
}
