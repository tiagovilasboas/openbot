// Install links: a bot template carried in the URL fragment. The fragment
// never reaches a server, so sharing a link shares nothing with the host.
import { TEMPLATE_FILE_MAX_BYTES } from "./bot-template-file-types.ts";

export const INSTALL_FRAGMENT_KEY = "install";

/** Longest fragment read; past it the link is refused before decoding. */
export const INSTALL_FRAGMENT_MAX_CHARS = Math.ceil(
  (TEMPLATE_FILE_MAX_BYTES * 4) / 3,
);

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/** The link that opens this app with the template ready to review. */
export function buildInstallLink(appUrl: string, templateJson: string): string {
  const base = appUrl.split("#")[0];
  const encoded = toBase64Url(new TextEncoder().encode(templateJson));
  return `${base}#${INSTALL_FRAGMENT_KEY}=${encoded}`;
}

/**
 * The template text inside a URL fragment, or null when the fragment is not
 * an install link. The text is still untrusted: parse it as a template file.
 */
export function readInstallFragment(hash: string): string | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  const prefix = `${INSTALL_FRAGMENT_KEY}=`;
  if (!fragment.startsWith(prefix)) return null;
  const encoded = fragment.slice(prefix.length);
  if (!encoded || encoded.length > INSTALL_FRAGMENT_MAX_CHARS) return null;
  const bytes = fromBase64Url(encoded);
  if (!bytes) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
