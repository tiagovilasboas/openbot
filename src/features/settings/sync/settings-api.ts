import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import {
  SETTING_KEYS,
  type AppSettings,
  type SettingsPatch,
} from "../settings-types.ts";
import { validateSetting } from "../settings-validation.ts";
import type {
  SettingsApi,
  SettingsResult,
  SyncFailure,
  WriteResult,
} from "./settings-sync-types.ts";

const URL_BASE = "/api/settings";

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

// The browser validates again what the server already validated.
function readSettingsReply(data: unknown): AppSettings | null {
  const raw = (data as { settings?: unknown } | null)?.settings;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return null;
  const settings: Record<string, unknown> = {};
  for (const key of SETTING_KEYS) {
    const value = validateSetting(key, (raw as Record<string, unknown>)[key]);
    if (value !== undefined) settings[key] = value;
  }
  return settings as AppSettings;
}

/** The HTTP client for /api/settings; fetch is injected for tests. */
export function createSettingsApi(
  fetchFn: typeof fetch = (...args) => fetch(...args),
): SettingsApi {
  return {
    async get(): Promise<SettingsResult> {
      const result = await request(fetchFn, { method: "GET" });
      if (!result.ok) return result;
      const settings = readSettingsReply(result.data);
      return settings
        ? { ok: true, settings }
        : { ok: false, failure: { kind: "network" } };
    },
    async put(patch: SettingsPatch): Promise<WriteResult> {
      const result = await request(fetchFn, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings: patch }),
      });
      return result.ok ? { ok: true } : result;
    },
  };
}
