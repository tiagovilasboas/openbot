import type { DatabaseSync } from "node:sqlite";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import { isSettingKey, type SettingsPatch } from "../settings-types.ts";
import { validateSetting } from "../settings-validation.ts";
import { applySettings, readSettings } from "./settings-repository.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/** GET /api/settings: the saved settings, only the keys that were saved. */
export function handleGetSettings(db: DatabaseSync): Response {
  return json({ settings: readSettings(db) });
}

type Parsed =
  { ok: true; patch: SettingsPatch } | { ok: false; response: Response };

function parsePatch(settings: Record<string, unknown>): Parsed {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!isSettingKey(key)) {
      return {
        ok: false,
        response: json({ error: "unknown_setting", key }, 400),
      };
    }
    if (value === null) {
      patch[key] = null;
      continue;
    }
    const clean = validateSetting(key, value);
    if (clean === undefined) {
      return {
        ok: false,
        response: json({ error: "invalid_setting", key }, 400),
      };
    }
    patch[key] = clean;
  }
  return { ok: true, patch: patch as SettingsPatch };
}

/**
 * PUT /api/settings: merges per key. A key left out stays, null clears it,
 * and nothing is written unless every key is valid.
 */
export async function handlePutSettings(
  request: Request,
  db: DatabaseSync,
): Promise<Response> {
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("PUT", "/api/settings"),
  );
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Falls through to invalid_body.
  }
  const settings =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).settings
      : undefined;
  if (
    typeof settings !== "object" ||
    settings === null ||
    Array.isArray(settings)
  ) {
    return json({ error: "invalid_body" }, 400);
  }
  const parsed = parsePatch(settings as Record<string, unknown>);
  if (!parsed.ok) return parsed.response;
  applySettings(db, parsed.patch);
  return json({ settings: readSettings(db) });
}
