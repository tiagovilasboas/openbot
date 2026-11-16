import { resetSecondsFromHeaders, withResetTag } from "./usage-limit-reset.ts";

/**
 * Upstream error text is free-form and may echo request data, so callers only
 * ever see the HTTP status plus a short tag from a fixed vocabulary. The
 * failure classifier reads the status number and the "model" word in the tag.
 */
export function providerErrorDetail(
  status: number,
  upstreamMessage?: string | null,
  headers?: Pick<Headers, "get">,
): string {
  if (status === 400) {
    return /model/i.test(upstreamMessage ?? "")
      ? "400: invalid_model"
      : "400: bad_request";
  }
  if (status === 401) return "401: unauthorized";
  if (status === 403) return "403: forbidden";
  if (status === 404) return "404: not_found";
  if (status === 429) {
    return withResetTag("429: rate_limited", resetSecondsFromHeaders(headers));
  }
  if (status >= 500 && status <= 599) return `${status}: upstream_error`;
  return `HTTP ${status}`;
}
