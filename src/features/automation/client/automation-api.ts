import { withApiHeaders } from "../../server-guard/api-request-init.ts";

const PATH = "/api/automation/token";

export type TokenStatus = { exists: boolean };

async function call(method: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(PATH, withApiHeaders({ method }));
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchTokenStatus(): Promise<TokenStatus | null> {
  const body = await call("GET");
  return body ? { exists: body.exists === true } : null;
}

/** Creates or rotates; the plaintext token comes back this once. */
export async function createToken(): Promise<string | null> {
  const body = await call("POST");
  return typeof body?.token === "string" ? body.token : null;
}

export async function revokeToken(): Promise<boolean> {
  return (await call("DELETE"))?.revoked === true;
}

/** A curl line for the local route; the token is passed as given. */
export function curlExample(origin: string, token: string): string {
  return `curl -X POST ${origin}/api/automation/run \\
  -H "Authorization: Bearer ${token}" \\
  -H "X-Openbot-Client: 1" \\
  -H "Content-Type: application/json" \\
  -d '{"botId":"BOT_ID","prompt":"Hello"}'`;
}
