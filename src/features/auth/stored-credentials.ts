import type { LocalAuthCredentials } from "./auth-types.ts";

/** A real salt is 32 characters and a real hash 64; this is generous. */
export const CREDENTIAL_HEX_MAX = 256;
/** The password hint is free text typed by the user. */
export const HINT_MAX_LENGTH = 200;
/** Above this a stored count would freeze the page on every unlock try. */
export const ITERATIONS_MAX = 10_000_000;
const CREATED_AT_MAX = 40;

function isBounded(value: unknown): value is string {
  return typeof value === "string" && value.length <= CREDENTIAL_HEX_MAX;
}

/**
 * Reads untrusted credentials, from storage or about to be saved. Null when
 * the salt, hash or iteration count cannot be real: such a record could
 * never verify a password, so keeping it would only lock the user out for
 * good. A hint or a date that is too long is cut, never a reason to drop
 * the lock.
 */
export function normalizeCredentials(
  raw: unknown,
): LocalAuthCredentials | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const { salt, hash, iterations, hint, createdAt } = raw as Record<
    string,
    unknown
  >;
  if (!isBounded(salt) || !isBounded(hash)) return null;
  if (
    typeof iterations !== "number" ||
    !Number.isInteger(iterations) ||
    iterations < 0 ||
    iterations > ITERATIONS_MAX
  ) {
    return null;
  }
  const keptHint =
    typeof hint === "string" ? hint.slice(0, HINT_MAX_LENGTH) : undefined;
  return {
    salt,
    hash,
    iterations,
    hint: keptHint,
    createdAt:
      typeof createdAt === "string" && createdAt
        ? createdAt.slice(0, CREATED_AT_MAX)
        : new Date().toISOString(),
  };
}
