import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import { checkRoutineInput, type RoutineInput } from "../routine-input.ts";

/** A routine as the server lists it: the input plus its timing. */
export type SavedRoutine = RoutineInput & {
  runningSince: number | null;
  nextRunAt: number | null;
  lastRunAt: number | null;
};

/** One past run, newest first in the list. Output is null when silent. */
export type RoutineRun = {
  id: number;
  origin: "schedule" | "manual" | "chain";
  startedAt: number;
  finishedAt: number | null;
  status: "running" | "succeeded" | "failed";
  reason: string | null;
  nothingNew: boolean | null;
  output: string | null;
};

/** What a call failed with: the server's error code, or "network". */
export type ApiFailure = { ok: false; error: string };
export type ApiResult<T> = { ok: true; value: T } | ApiFailure;

const BASE = "/api/routines";

const numberOrNull = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** Keeps a server routine only when it still passes the input check. */
export function parseSavedRoutine(raw: unknown): SavedRoutine | null {
  const checked = checkRoutineInput(raw);
  if (!checked.ok) return null;
  const extra = raw as Record<string, unknown>;
  return {
    ...checked.routine,
    runningSince: numberOrNull(extra.runningSince),
    nextRunAt: numberOrNull(extra.nextRunAt),
    lastRunAt: numberOrNull(extra.lastRunAt),
  };
}

const RUN_STATUSES = new Set(["running", "succeeded", "failed"]);

/** Keeps a run record only when its required fields are well formed. */
export function parseRun(raw: unknown): RoutineRun | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "number" || typeof r.startedAt !== "number") return null;
  if (typeof r.status !== "string" || !RUN_STATUSES.has(r.status)) return null;
  return {
    id: r.id,
    origin:
      r.origin === "manual" || r.origin === "chain" ? r.origin : "schedule",
    startedAt: r.startedAt,
    finishedAt: numberOrNull(r.finishedAt),
    status: r.status as RoutineRun["status"],
    reason: typeof r.reason === "string" ? r.reason : null,
    nothingNew: typeof r.nothingNew === "boolean" ? r.nothingNew : null,
    output: typeof r.output === "string" ? r.output : null,
  };
}

function listOf<T>(value: unknown, parse: (raw: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(parse).filter((item): item is T => item !== null);
}

async function call(
  path: string,
  init: RequestInit,
): Promise<ApiResult<Record<string, unknown>>> {
  try {
    const response = await fetch(path, withApiHeaders(init));
    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      const error = typeof body.error === "string" ? body.error : "http";
      return { ok: false, error };
    }
    return { ok: true, value: body };
  } catch {
    return { ok: false, error: "network" };
  }
}

function map<T, U>(result: ApiResult<T>, f: (value: T) => U): ApiResult<U> {
  return result.ok ? { ok: true, value: f(result.value) } : result;
}

const query = (key: string, value: string) =>
  `?${key}=${encodeURIComponent(value)}`;

/** The routines of one bot. */
export async function fetchRoutines(
  botId: string,
): Promise<ApiResult<SavedRoutine[]>> {
  const result = await call(`${BASE}${query("botId", botId)}`, {
    method: "GET",
  });
  return map(result, (body) => listOf(body.routines, parseSavedRoutine));
}

/** Creates or replaces a routine; the saved copy on success. */
export async function putRoutine(
  input: RoutineInput,
): Promise<ApiResult<SavedRoutine | null>> {
  const result = await call(BASE, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return map(result, (body) => parseSavedRoutine(body.routine));
}

/** Deletes a routine and its run history. */
export async function removeRoutine(id: string): Promise<ApiResult<true>> {
  const result = await call(`${BASE}${query("id", id)}`, { method: "DELETE" });
  return map(result, () => true as const);
}

/** Runs a routine now and waits for it to finish. */
export async function runRoutineNow(id: string): Promise<ApiResult<true>> {
  const result = await call(`${BASE}/run${query("id", id)}`, {
    method: "POST",
  });
  return map(result, () => true as const);
}

/** The latest runs of a routine, newest first. */
export async function fetchRuns(id: string): Promise<ApiResult<RoutineRun[]>> {
  const result = await call(`${BASE}/runs${query("id", id)}`, {
    method: "GET",
  });
  return map(result, (body) => listOf(body.runs, parseRun));
}
