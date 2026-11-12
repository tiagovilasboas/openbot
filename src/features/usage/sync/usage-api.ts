import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import type { SyncFailure } from "../../conversations/sync/conversations-sync-types.ts";
import { sanitizeUsage } from "../sanitize-usage.ts";
import type { UsageApi, UsageResult } from "./usage-sync-types.ts";

const URL_BASE = "/api/usage";

async function request(
  fetchFn: typeof fetch,
  init: RequestInit,
): Promise<{ ok: true; data: unknown } | { ok: false; failure: SyncFailure }> {
  let response: Response;
  try {
    response = await fetchFn(URL_BASE, withApiHeaders(init));
  } catch {
    return { ok: false, failure: { kind: "network" } };
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // A body that is not JSON carries nothing to read.
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

/** The HTTP client for /api/usage; fetch is injected for tests. */
export function createUsageApi(
  fetchFn: typeof fetch = (...args) => fetch(...args),
): UsageApi {
  return {
    async get(): Promise<UsageResult> {
      const result = await request(fetchFn, { method: "GET" });
      if (!result.ok) return result;
      const records = (result.data as { records?: unknown } | null)?.records;
      // The client sanitizes what the server already validated.
      return Array.isArray(records)
        ? { ok: true, records: sanitizeUsage(records) }
        : { ok: false, failure: { kind: "network" } };
    },
    async put(records) {
      const result = await request(fetchFn, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ records }),
      });
      return result.ok ? { ok: true } : result;
    },
  };
}
