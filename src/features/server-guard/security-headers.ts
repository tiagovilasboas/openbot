export type HeaderEntry = { key: string; value: string };

/**
 * A static CSP, not a per-request nonce: nonces force every page to render
 * dynamically, and this app is a static shell. Next injects small inline
 * bootstrap scripts and HeroUI sets inline styles, hence 'unsafe-inline' for
 * script and style. Dev also needs eval and a websocket for hot reload.
 */
export function buildContentSecurityPolicy(isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];
  const connectSrc = ["'self'", ...(isDev ? ["ws:", "wss:"] : [])];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
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

export function buildSecurityHeaders(isDev: boolean): HeaderEntry[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isDev),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
  ];
}
