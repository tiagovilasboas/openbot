export type HeaderEntry = { key: string; value: string };

/**
 * One fresh, unguessable nonce per request: base64 of a random UUID. It is
 * only used in the CSP header, which Next reads back from the request to stamp
 * its own inline scripts and styles.
 */
export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Per-request CSP built from a nonce. The proxy sets it and the root layout
 * opts into dynamic rendering so Next can stamp the nonce on its scripts.
 *
 * script-src: no 'unsafe-inline'. The nonce allows Next's inline bootstrap
 * scripts and 'strict-dynamic' lets those nonced scripts load the chunks they
 * need ('self' is ignored by browsers that honor 'strict-dynamic' and stays
 * only as a fallback). Dev also needs eval for React debugging.
 *
 * style-src: no 'unsafe-inline' for <style> elements; they need the nonce.
 *
 * style-src-attr 'unsafe-inline': a nonce can never cover style="" attributes,
 * and this app renders them on the server (BotAvatar, AutoTextarea,
 * ThinkingIndicator, SettingsTabs set React style props; HeroUI and react-aria
 * position overlays with inline styles too). Without this narrow allowance the
 * server-rendered attributes are blocked. It does not allow <style> elements
 * or script execution. Moving those few values to classes or CSS custom
 * properties would let this line go as well.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  isDev: boolean,
): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];
  const connectSrc = ["'self'", ...(isDev ? ["ws:", "wss:"] : [])];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** Headers that do not depend on the request; the CSP lives in the proxy. */
export function buildStaticSecurityHeaders(): HeaderEntry[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ];
}
