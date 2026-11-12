import type {
  SyncFailure,
  WriteResult,
} from "../../conversations/sync/conversations-sync-types.ts";
import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import { sanitizeMemoryEntries } from "../memory-entries.ts";
import type { MemoryApi, NotesResult } from "./memory-sync-types.ts";

const URL_BASE = "/api/memory";

const urlFor = (botId: string) =>
  `${URL_BASE}?botId=${encodeURIComponent(botId)}`;

async function request(
  fetchFn: typeof fetch,
  botId: string,
  init: RequestInit,
): Promise<{ ok: true; data: unknown } | { ok: false; failure: SyncFailure }> {
  let response: Response;
  try {
    response = await fetchFn(urlFor(botId), withApiHeaders(init));
  } catch {
    return { ok: false, failure: { kind: "network" } };
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // A 204 or a body that is not JSON carries nothing to read.
  }
  if (response.ok) return { ok: true, data };
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

/** The HTTP client for /api/memory; fetch is injected for tests. */
export function createMemoryApi(
  fetchFn: typeof fetch = (...args) => fetch(...args),
): MemoryApi {
  return {
    async get(botId): Promise<NotesResult> {
      const result = await request(fetchFn, botId, { method: "GET" });
      if (!result.ok) return result;
      const entries = (result.data as { entries?: unknown } | null)?.entries;
      // The client sanitizes what the server already validated.
      return Array.isArray(entries)
        ? { ok: true, entries: sanitizeMemoryEntries(entries) }
        : { ok: false, failure: { kind: "network" } };
    },
    async put(botId, entries): Promise<WriteResult> {
      const result = await request(fetchFn, botId, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      return result.ok ? { ok: true } : result;
    },
    async remove(botId): Promise<WriteResult> {
      const result = await request(fetchFn, botId, { method: "DELETE" });
      return result.ok ? { ok: true } : result;
    },
  };
}
