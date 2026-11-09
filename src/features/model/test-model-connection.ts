import { withApiHeaders } from "../server-guard/api-request-init.ts";
import type { ClientModelConfig } from "./model-config.ts";

export type TestConnectionOutcome =
  | { ok: true; provider: string; model?: string }
  | { ok: false; error: string; provider?: string; detail?: string };

export type ActiveServerModelOutcome = {
  configured: boolean;
  provider?: string;
  model?: string;
};

export async function testModelConnection(
  config: ClientModelConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<TestConnectionOutcome> {
  try {
    const response = await fetchImpl(
      "/api/model/test",
      withApiHeaders({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config }),
      }),
    );

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      provider?: string;
      model?: string;
      error?: string;
    } | null;

    if (response.ok && payload?.ok) {
      return {
        ok: true,
        provider: payload.provider ?? config.provider,
        model: payload.model ?? ("model" in config ? config.model : undefined),
      };
    }

    const detail = (payload as { detail?: string } | null)?.detail;
    return {
      ok: false,
      error: payload?.error ?? "connection_failed",
      provider: payload?.provider ?? config.provider,
      ...(detail ? { detail } : {}),
    };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

export async function fetchActiveServerModel(
  fetchImpl: typeof fetch = fetch,
): Promise<ActiveServerModelOutcome> {
  try {
    const response = await fetchImpl(
      "/api/model/test",
      withApiHeaders({
        method: "GET",
      }),
    );
    if (!response.ok) return { configured: false };
    const payload = (await response.json().catch(() => null)) as {
      configured?: boolean;
      provider?: string;
      model?: string;
    } | null;
    return {
      configured: Boolean(payload?.configured),
      provider: payload?.provider,
      model: payload?.model,
    };
  } catch {
    return { configured: false };
  }
}
