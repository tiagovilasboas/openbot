/** Header the client sets to the id of one user send; see the chat feature. */
export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";

const SHAPE = /^[A-Za-z0-9_-]{8,64}$/;

export type IdempotencyKey = { ok: true; key?: string } | { ok: false };

/**
 * The send id of a request. Absent is fine (older clients); a present value
 * is untrusted input and must match the id shape, else the request is refused.
 */
export function readIdempotencyKey(headers: Headers): IdempotencyKey {
  const raw = headers.get(IDEMPOTENCY_KEY_HEADER);
  if (raw === null) return { ok: true };
  return SHAPE.test(raw) ? { ok: true, key: raw } : { ok: false };
}
