import { timingSafeEqual } from "node:crypto";
import type { GuardDecision } from "./guard-types.ts";

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

/** When no token is configured the server stays open, as on localhost today. */
export function checkAccessToken(
  headers: Headers,
  expectedToken: string | undefined,
): GuardDecision {
  if (!expectedToken) return { ok: true };
  const match = /^Bearer (.+)$/.exec(headers.get("authorization") ?? "");
  if (!match || !safeEqual(match[1], expectedToken)) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}
