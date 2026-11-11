import { KEYED_PROVIDERS, type KeyedProvider } from "../model/provider-keys.ts";

// Pure input rules for the key vault. Nothing here touches storage or crypto.

export type VaultErrorCode =
  "invalid_provider" | "invalid_key" | "invalid_origin";

export const MAX_KEY_LENGTH = 500;

export type ValidationResult<T> =
  { ok: true; value: T } | { ok: false; code: VaultErrorCode };

const CONTROL_OR_SPACE = /[\p{Cc}\s]/u;

export function validateProvider(
  value: unknown,
): ValidationResult<KeyedProvider> {
  const match = KEYED_PROVIDERS.find((provider) => provider === value);
  return match
    ? { ok: true, value: match }
    : { ok: false, code: "invalid_provider" };
}

export function validateKey(value: unknown): ValidationResult<string> {
  if (typeof value !== "string") return { ok: false, code: "invalid_key" };
  const trimmed = value.trim();
  if (
    trimmed.length < 1 ||
    trimmed.length > MAX_KEY_LENGTH ||
    CONTROL_OR_SPACE.test(trimmed)
  ) {
    return { ok: false, code: "invalid_key" };
  }
  return { ok: true, value: trimmed };
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    /^127(\.\d{1,3}){3}$/.test(hostname)
  );
}

// Keeps only the origin. https is required, except http on a loopback host.
export function validateOrigin(value: unknown): ValidationResult<string> {
  if (typeof value !== "string") return { ok: false, code: "invalid_origin" };
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { ok: false, code: "invalid_origin" };
  }
  const allowed =
    url.protocol === "https:" ||
    (url.protocol === "http:" && isLoopbackHost(url.hostname));
  return allowed
    ? { ok: true, value: url.origin }
    : { ok: false, code: "invalid_origin" };
}
