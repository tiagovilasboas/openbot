import { isConnectionId } from "../core/index.ts";
import {
  finishOAuthConnect,
  startOAuthConnect,
  type FinishOAuthDeps,
  type FinishOAuthOutcome,
  type StartOAuthDeps,
} from "../oauth/index.ts";
import {
  failure,
  json,
  readJsonObject,
  requestOrigin,
  stringField,
} from "./connection-response.ts";

/**
 * POST /api/connections/[id]/start: the provider page to open. Only offered
 * when the Connect route for the caller's origin is OAuth.
 */
export async function handleStart(
  request: Request,
  rawId: string,
  deps: StartOAuthDeps,
): Promise<Response> {
  if (!isConnectionId(rawId)) return failure("unknown_connection", 404);
  const started = await startOAuthConnect(deps, rawId, requestOrigin(request));
  if (!started.ok) return failure(started.error, 409);
  return json({ authorizeUrl: started.authorizeUrl });
}

function statusFor(outcome: FinishOAuthOutcome): number {
  if (outcome.status === "connected") return 200;
  if (outcome.status === "expired") return 410;
  if (outcome.reason === "network") return 502;
  if (outcome.reason === "unavailable") return 500;
  return 400;
}

/**
 * POST /api/connections/[id]/callback with `{ state, code?, error? }`, which
 * the app reads from the URL the provider sent the browser back to. The
 * answer is the outcome only: the key is saved on the server, never returned.
 */
export async function handleCallback(
  request: Request,
  rawId: string,
  deps: FinishOAuthDeps,
): Promise<Response> {
  if (!isConnectionId(rawId)) return failure("unknown_connection", 404);
  const body = await readJsonObject(request);
  if (!body) return failure("invalid_body", 400);
  const outcome = await finishOAuthConnect(deps, rawId, {
    state: stringField(body, "state"),
    code: stringField(body, "code"),
    error: stringField(body, "error"),
  });
  return json(outcome, statusFor(outcome));
}
