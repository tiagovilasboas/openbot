import { buildContentSecurityPolicy, createNonce } from "./security-headers.ts";

/**
 * The request headers Next reads to stamp the nonce, plus the CSP value to
 * send on the response. Pure so the proxy stays a thin adapter.
 */
export function withPageCsp(
  incoming: Headers,
  isDev: boolean,
  nonce: string = createNonce(),
): { requestHeaders: Headers; csp: string; nonce: string } {
  const csp = buildContentSecurityPolicy(nonce, isDev);
  const requestHeaders = new Headers(incoming);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  return { requestHeaders, csp, nonce };
}
