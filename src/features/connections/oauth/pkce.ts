/**
 * PKCE (RFC 7636) secrets for an OAuth Connect. Uses the Web Crypto global,
 * so this file imports nothing and stays runtime-neutral.
 */

/** Fills `size` random bytes; injected so tests are deterministic. */
export type RandomBytes = (size: number) => Uint8Array;

// 32 bytes encode to 43 base64url characters, the shortest verifier allowed.
const VERIFIER_BYTES = 32;
const STATE_BYTES = 16;

export const webRandomBytes: RandomBytes = (size) =>
  crypto.getRandomValues(new Uint8Array(size));

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** S256 challenge: base64url(sha256(verifier)). */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(new Uint8Array(digest));
}

export interface Pkce {
  verifier: string;
  challenge: string;
}

export async function createPkce(
  random: RandomBytes = webRandomBytes,
): Promise<Pkce> {
  const verifier = base64url(random(VERIFIER_BYTES));
  return { verifier, challenge: await challengeFor(verifier) };
}

/** One-time token that ties a callback to the Connect that started it. */
export function createState(random: RandomBytes = webRandomBytes): string {
  return base64url(random(STATE_BYTES));
}
