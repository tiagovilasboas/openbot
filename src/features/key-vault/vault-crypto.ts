import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM. The AAD binds a ciphertext to its provider and origin, so a row
// copied to another provider or origin fails authentication on decrypt.

const IV_BYTES = 12;
const AAD_PREFIX = "openbot-key-vault:v1";

export type SealedKey = { iv: Buffer; tag: Buffer; ciphertext: Buffer };

function aad(provider: string, origin: string): Buffer {
  return Buffer.from(`${AAD_PREFIX}|${provider}|${origin}`, "utf8");
}

export function sealKey(
  masterKey: Buffer,
  provider: string,
  origin: string,
  plaintext: string,
): SealedKey {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  cipher.setAAD(aad(provider, origin));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return { iv, tag: cipher.getAuthTag(), ciphertext };
}

// Any failure (wrong key, moved row, tampering) means "no key"; nothing leaks.
export function openKey(
  masterKey: Buffer,
  provider: string,
  origin: string,
  sealed: SealedKey,
): string | undefined {
  try {
    const decipher = createDecipheriv("aes-256-gcm", masterKey, sealed.iv);
    decipher.setAAD(aad(provider, origin));
    decipher.setAuthTag(sealed.tag);
    return Buffer.concat([
      decipher.update(sealed.ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return undefined;
  }
}
