import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import { isToolLevel, type ToolLevel } from "../tool-policy.ts";

export interface ToolLevelEntry {
  name: string;
  level: ToolLevel;
  /** False when the tool does not opt in to running without asking. */
  canAllow: boolean;
  /** False for a tool the user answers (ask_user): it asks every time. */
  canAsk: boolean;
}

const URL_BASE = "/api/tools/levels";

/** Keeps only well-formed entries from a server answer. */
export function parseLevels(data: unknown): ToolLevelEntry[] | null {
  const list = (data as { tools?: unknown } | null)?.tools;
  if (!Array.isArray(list)) return null;
  return list
    .filter(
      (item) =>
        typeof item?.name === "string" &&
        isToolLevel(item?.level) &&
        typeof item?.canAllow === "boolean",
    )
    .map((item) => ({
      name: item.name,
      level: item.level,
      canAllow: item.canAllow,
      canAsk: item.canAsk !== false,
    }));
}

async function call(init: RequestInit): Promise<ToolLevelEntry[] | null> {
  try {
    const response = await fetch(URL_BASE, withApiHeaders(init));
    if (!response.ok) return null;
    return parseLevels(await response.json());
  } catch {
    return null;
  }
}

/** Every tool with its level, or null when the server could not answer. */
export const fetchLevels = () => call({ method: "GET" });

/** Sets one tool's level; the fresh list, or null on failure. */
export const saveLevel = (toolName: string, level: ToolLevel) =>
  call({
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ toolName, level }),
  });
