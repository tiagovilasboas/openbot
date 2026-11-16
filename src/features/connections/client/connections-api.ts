import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import type { ConnectFailure, ConnectionId } from "../core/index.ts";
import {
  outcomeFromResponse,
  type CallbackOutcome,
} from "./callback-outcome.ts";
import type { ConnectReturn } from "./connect-return.ts";

type FetchFn = typeof fetch;

export type StartResult =
  { ok: true; authorizeUrl: string } | { ok: false; reason: ConnectFailure };

const JSON_HEADERS = { "content-type": "application/json" };

function url(id: ConnectionId, action?: string): string {
  return `/api/connections/${id}${action ? `/${action}` : ""}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isHttps(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Asks the server for the provider's sign-in page. */
export async function startConnect(
  id: ConnectionId,
  fetchFn: FetchFn = (...args) => fetch(...args),
): Promise<StartResult> {
  try {
    const response = await fetchFn(
      url(id, "start"),
      withApiHeaders({ method: "POST" }),
    );
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const body = (await readJson(response)) as {
      authorizeUrl?: unknown;
    } | null;
    return isHttps(body?.authorizeUrl)
      ? { ok: true, authorizeUrl: body.authorizeUrl }
      : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Hands the provider's answer to the server, which exchanges and stores. */
export async function finishConnect(
  returned: ConnectReturn,
  fetchFn: FetchFn = (...args) => fetch(...args),
): Promise<CallbackOutcome> {
  const { id, ...payload } = returned;
  try {
    const response = await fetchFn(
      url(id, "callback"),
      withApiHeaders({
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      }),
    );
    return outcomeFromResponse(response.status, await readJson(response));
  } catch {
    return { status: "failed", reason: "network" };
  }
}

/** Forgets the credential on the server. False when it could not. */
export async function disconnectConnection(
  id: ConnectionId,
  fetchFn: FetchFn = (...args) => fetch(...args),
): Promise<boolean> {
  try {
    const response = await fetchFn(
      url(id),
      withApiHeaders({ method: "DELETE" }),
    );
    return response.ok;
  } catch {
    return false;
  }
}
