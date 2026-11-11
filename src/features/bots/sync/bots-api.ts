import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import { isValidBotId } from "../bot-id.ts";
import { sanitizeBotList } from "../bot-storage.ts";
import type {
  ApiResult,
  BotsApi,
  BotsPayload,
  BotsServerState,
} from "./bots-sync-types.ts";

const BOTS_URL = "/api/bots";

function idOrNull(value: unknown): string | null {
  return isValidBotId(value) ? value : null;
}

// The server already validated the list; the client sanitizes it anyway.
function parseState(data: unknown): BotsServerState | null {
  if (typeof data !== "object" || data === null) return null;
  const body = data as Record<string, unknown>;
  if (!Array.isArray(body.bots)) return null;
  return {
    bots: sanitizeBotList(body.bots),
    activeBotId: idOrNull(body.activeBotId),
    mainBotId: idOrNull(body.mainBotId),
  };
}

async function call(
  fetchFn: typeof fetch,
  init: RequestInit,
): Promise<ApiResult> {
  let response: Response;
  try {
    response = await fetchFn(BOTS_URL, withApiHeaders(init));
  } catch {
    return { ok: false, failure: { kind: "network" } };
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // A body that is not JSON is handled below.
  }
  if (!response.ok) {
    const error = (data as { error?: unknown } | null)?.error;
    return {
      ok: false,
      failure: {
        kind: "http",
        status: response.status,
        ...(typeof error === "string" && { error }),
      },
    };
  }
  const state = parseState(data);
  return state
    ? { ok: true, state }
    : { ok: false, failure: { kind: "network" } };
}

/** The client of /api/bots; `fetchFn` is injected so it runs anywhere. */
export function createBotsApi(
  fetchFn: typeof fetch = (...args) => fetch(...args),
): BotsApi {
  return {
    get: () => call(fetchFn, { method: "GET", cache: "no-store" }),
    put: (payload: BotsPayload) =>
      call(fetchFn, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
  };
}
