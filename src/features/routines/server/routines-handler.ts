import type { DatabaseSync } from "node:sqlite";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import { checkRoutineInput, isRoutineId } from "../routine-input.ts";
import { claimRoutine, listRuns } from "./routine-runs-repository.ts";
import {
  deleteRoutine,
  getRoutine,
  listRoutines,
  saveRoutine,
} from "./routines-repository.ts";
import { runClaimedRoutine, type RoutineRunner } from "./run-routines.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function idParam(request: Request, name: string): string | null {
  const value = new URL(request.url).searchParams.get(name);
  return isRoutineId(value) ? value : null;
}

/** GET /api/routines[?botId=]: the saved routines, all or one bot's. */
export function handleListRoutines(
  request: Request,
  db: DatabaseSync,
): Response {
  const raw = new URL(request.url).searchParams.get("botId");
  if (raw !== null && !isRoutineId(raw))
    return json({ error: "invalid_id" }, 400);
  return json({ routines: listRoutines(db, raw ?? undefined) });
}

/** PUT /api/routines: creates or replaces one routine of an existing bot. */
export async function handleSaveRoutine(
  request: Request,
  db: DatabaseSync,
  botExists: (botId: string) => boolean,
  now: () => number = Date.now,
): Promise<Response> {
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("PUT", "/api/routines"),
  );
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Falls through to the validation error.
  }
  const checked = checkRoutineInput(body);
  if (!checked.ok) return json({ error: checked.problem }, 400);
  if (!botExists(checked.routine.botId))
    return json({ error: "bot_missing" }, 404);
  const saved = saveRoutine(db, checked.routine, now());
  if (!saved.ok) return json({ error: saved.error }, 409);
  return json({ routine: saved.routine });
}

/** DELETE /api/routines?id=: removes a routine and its run history. */
export function handleDeleteRoutine(
  request: Request,
  db: DatabaseSync,
): Response {
  const id = idParam(request, "id");
  if (!id) return json({ error: "invalid_id" }, 400);
  return deleteRoutine(db, id)
    ? json({ ok: true })
    : json({ error: "not_found" }, 404);
}

/** GET /api/routines/runs?id=: the latest runs of a routine, newest first. */
export function handleListRuns(request: Request, db: DatabaseSync): Response {
  const id = idParam(request, "id");
  if (!id) return json({ error: "invalid_id" }, 400);
  if (!getRoutine(db, id)) return json({ error: "not_found" }, 404);
  return json({ runs: listRuns(db, id) });
}

/** POST /api/routines/run?id=: runs a routine now and waits for the result. */
export async function handleRunNow(
  request: Request,
  db: DatabaseSync,
  runner: RoutineRunner,
  clock: () => number = Date.now,
): Promise<Response> {
  const id = idParam(request, "id");
  if (!id) return json({ error: "invalid_id" }, 400);
  if (!getRoutine(db, id)) return json({ error: "not_found" }, 404);
  const routine = claimRoutine(db, id, clock());
  if (!routine) return json({ error: "already_running" }, 409);
  const end = await runClaimedRoutine(db, routine, "manual", runner, clock);
  return json({ run: end, routine: getRoutine(db, id) });
}
