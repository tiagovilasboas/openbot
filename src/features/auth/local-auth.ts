import type { LocalAuthCredentials } from "./auth-types.ts";

/** Iterations for new passwords (OWASP guidance for PBKDF2-HMAC-SHA256). */
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
/** What credentials saved before the count was raised were hashed with. */
export const LEGACY_PBKDF2_ITERATIONS = 100_000;

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function generateSalt(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function deriveKey(
  password: string,
  saltBytes: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return new Uint8Array(derivedBits);
}

export async function createCredentials(
  password: string,
  hint?: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS,
): Promise<LocalAuthCredentials> {
  const saltHex = generateSalt(16);
  const saltBytes = hexToBytes(saltHex);
  const hashBytes = await deriveKey(password, saltBytes, iterations);
  const hashHex = bytesToHex(hashBytes);

  return {
    salt: saltHex,
    hash: hashHex,
    iterations,
    ...(hint && hint.trim() ? { hint: hint.trim() } : {}),
    createdAt: new Date().toISOString(),
  };
}

export async function verifyPassword(
  password: string,
  credentials: LocalAuthCredentials,
): Promise<boolean> {
  try {
    const saltBytes = hexToBytes(credentials.salt);
    const expectedHashBytes = hexToBytes(credentials.hash);
    const candidateHashBytes = await deriveKey(
      password,
      saltBytes,
      credentials.iterations || LEGACY_PBKDF2_ITERATIONS,
    );

    return constantTimeEqual(candidateHashBytes, expectedHashBytes);
  } catch {
    return false;
  }
}

/**
 * Fresh credentials for the same password at the current iteration count,
 * or null when the stored ones are already strong enough. Call it only
 * after the password was verified.
 */
export async function upgradeCredentials(
  password: string,
  credentials: LocalAuthCredentials,
  targetIterations = DEFAULT_PBKDF2_ITERATIONS,
): Promise<LocalAuthCredentials | null> {
  const current = credentials.iterations || LEGACY_PBKDF2_ITERATIONS;
  if (current >= targetIterations) return null;
  const upgraded = await createCredentials(
    password,
    credentials.hint,
    targetIterations,
  );
  return { ...upgraded, createdAt: credentials.createdAt };
}
