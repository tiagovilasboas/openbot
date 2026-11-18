import type { DatabaseSync } from "node:sqlite";
import { isRoutineId } from "../../routines/routine-input.ts";
import { claimRoutine } from "../../routines/server/routine-runs-repository.ts";
import { getRoutine } from "../../routines/server/routines-repository.ts";
import {
  runClaimedRoutine,
  type RoutineRunner,
} from "../../routines/server/run-routines.ts";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import { isLoopbackAddress } from "../../server-guard/loopback-address.ts";
import { checkAutomationRequest } from "./automation-auth.ts";
import {
  automationTokenStatus,
  createAutomationToken,
  revokeAutomationToken,
} from "./automation-token-repository.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const MAX_PROMPT_CHARS = 8000;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

async function readJson(request: Request): Promise<unknown | undefined> {
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("POST", "/api/automation/run"),
  );
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * POST /api/automation/run: `{ botId, prompt }` or `{ routineId }`. Loopback
 * only, behind the dedicated token. Answers `{ text }` or `{ error }`.
 */
export async function handleAutomationRun(
  request: Request,
  db: DatabaseSync,
  address: string | undefined,
  runner: RoutineRunner,
  clock: () => number = Date.now,
): Promise<Response> {
  const auth = checkAutomationRequest(db, request.headers, address);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const body = await readJson(request);
  if (body === undefined) return json({ error: "payload_too_large" }, 413);
  const input = (body ?? {}) as Record<string, unknown>;

  if (typeof input.routineId === "string") {
    if (!isRoutineId(input.routineId))
      return json({ error: "invalid_id" }, 400);
    if (!getRoutine(db, input.routineId))
      return json({ error: "not_found" }, 404);
    const routine = claimRoutine(db, input.routineId, clock());
    if (!routine) return json({ error: "already_running" }, 409);
    const end = await runClaimedRoutine(db, routine, "manual", runner, clock);
    return end.status === "succeeded"
      ? json({ text: end.output })
      : json({ error: end.reason }, 502);
  }

  const { botId, prompt } = input;
  if (typeof botId !== "string" || !isRoutineId(botId))
    return json({ error: "invalid_input" }, 400);
  if (
    typeof prompt !== "string" ||
    !prompt.trim() ||
    prompt.length > MAX_PROMPT_CHARS
  )
    return json({ error: "invalid_input" }, 400);
  let result;
  try {
    result = await runner({
      id: "automation",
      botId,
      title: "automation",
      prompt,
      schedule: { kind: "interval", everyMinutes: 60 },
      enabled: false,
      silentWhenNothingNew: false,
      runningSince: null,
      nextRunAt: null,
      lastRunAt: null,
    });
  } catch {
    return json({ error: "unexpected_error" }, 502);
  }
  if (result.kind === "replied") return json({ text: result.text });
  return json(
    { error: result.reason },
    result.reason === "bot_missing" ? 404 : 502,
  );
}

function appOnly(address: string | undefined): Response | null {
  return isLoopbackAddress(address)
    ? null
    : json({ error: "loopback_only" }, 403);
}

/** GET /api/automation/token: whether a token exists (never the token). */
export function handleTokenStatus(
  db: DatabaseSync,
  address: string | undefined,
): Response {
  return appOnly(address) ?? json(automationTokenStatus(db));
}

/** POST /api/automation/token: creates or rotates; plaintext shown once. */
export function handleTokenCreate(
  db: DatabaseSync,
  address: string | undefined,
  now: () => number = Date.now,
): Response {
  const refused = appOnly(address);
  if (refused) return refused;
  const token = createAutomationToken(db, now());
  return json({ token, ...automationTokenStatus(db) });
}

/** DELETE /api/automation/token: revokes, which switches the route off. */
export function handleTokenRevoke(
  db: DatabaseSync,
  address: string | undefined,
): Response {
  return appOnly(address) ?? json({ revoked: revokeAutomationToken(db) });
}
