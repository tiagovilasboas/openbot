import { timingSafeEqual } from "node:crypto";
import type { GuardDecision } from "./guard-types.ts";
import { isLoopbackAddress } from "./loopback-address.ts";

/** Constant-time string comparison that does not leak the length either. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  const length = Math.max(left.length, right.length, 1);
  const paddedLeft = Buffer.alloc(length);
  const paddedRight = Buffer.alloc(length);
  left.copy(paddedLeft);
  right.copy(paddedRight);
  return (
    timingSafeEqual(paddedLeft, paddedRight) && left.length === right.length
  );
}

/**
 * Without a token only a loopback caller is served, as on localhost today;
 * anyone else, or a caller whose address is unknown, gets a 403 that says the
 * token is required. With a token every caller must present it.
 */
export function checkAccessToken(
  headers: Headers,
  expectedToken: string | undefined,
  address: string | undefined,
): GuardDecision {
  if (!expectedToken) {
    return isLoopbackAddress(address)
      ? { ok: true }
      : { ok: false, status: 403, error: "access_token_required" };
  }
  const match = /^Bearer (.+)$/.exec(headers.get("authorization") ?? "");
  if (!match || !safeEqual(match[1], expectedToken)) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}
