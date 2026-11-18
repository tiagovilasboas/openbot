import type { DatabaseSync } from "node:sqlite";
import type { ClientKeyEnv } from "../../server-guard/client-key.ts";
import { isDirectLocalRequest } from "../../server-guard/local-only-request.ts";
import { verifyAutomationToken } from "./automation-token-repository.ts";

/** Header for the token when Authorization already carries OPENBOT_ACCESS_TOKEN. */
export const AUTOMATION_TOKEN_HEADER = "x-openbot-automation-token";

export type AutomationAuth =
  | { ok: true }
  | {
      ok: false;
      status: 401 | 403 | 404;
      error:
        "automation_disabled" | "loopback_only" | "unauthorized" | "no_token";
    };

/** The presented token: the dedicated header, else Authorization: Bearer. */
export function presentedToken(headers: Headers): string | null {
  const dedicated = headers.get(AUTOMATION_TOKEN_HEADER)?.trim();
  if (dedicated) return dedicated;
  const match = /^Bearer (.+)$/.exec(headers.get("authorization") ?? "");
  return match ? match[1] : null;
}

/**
 * Order matters: a remote caller learns nothing (loopback first), the route
 * is off with no token, then the token itself is compared in constant time.
 */
export function checkAutomationRequest(
  db: DatabaseSync,
  headers: Headers,
  address: string | undefined,
  env: ClientKeyEnv = {},
): AutomationAuth {
  if (!isDirectLocalRequest(headers, address, env)) {
    return { ok: false, status: 403, error: "loopback_only" };
  }
  const presented = presentedToken(headers);
  const verdict = verifyAutomationToken(db, presented ?? "");
  if (verdict === "no_token_configured") {
    return { ok: false, status: 404, error: "automation_disabled" };
  }
  if (!presented) return { ok: false, status: 401, error: "no_token" };
  return verdict === "valid"
    ? { ok: true }
    : { ok: false, status: 401, error: "unauthorized" };
}
