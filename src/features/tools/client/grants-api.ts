import { withApiHeaders } from "../../server-guard/api-request-init.ts";

export interface ToolGrant {
  botId: string;
  toolName: string;
  grantedAt: number;
}

export type RevokeTarget = { botId: string; toolName: string } | { all: true };

const URL_BASE = "/api/tools/grants";

/** Keeps only well-formed grants from a server answer. */
export function parseGrants(data: unknown): ToolGrant[] | null {
  const list = (data as { grants?: unknown } | null)?.grants;
  if (!Array.isArray(list)) return null;
  return list.filter(
    (item): item is ToolGrant =>
      typeof item?.botId === "string" &&
      typeof item?.toolName === "string" &&
      typeof item?.grantedAt === "number",
  );
}

async function call(init: RequestInit): Promise<ToolGrant[] | null> {
  try {
    const response = await fetch(URL_BASE, withApiHeaders(init));
    if (!response.ok) return null;
    return parseGrants(await response.json());
  } catch {
    return null;
  }
}

/** The stored grants, or null when the server could not answer. */
export const fetchGrants = () => call({ method: "GET" });

/** Revokes one grant or all of them; the fresh list, or null on failure. */
export const revokeGrants = (target: RevokeTarget) =>
  call({
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(target),
  });
