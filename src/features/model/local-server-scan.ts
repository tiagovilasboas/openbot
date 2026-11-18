import { modelFetch } from "./guarded-model-fetch.ts";
import type { FetchLike } from "./model-adapter.ts";
import { sanitizeModelId } from "./model-id.ts";

/** Local model servers worth looking for; both are plain loopback URLs. */
export const LOCAL_SERVER_CANDIDATES = [
  {
    id: "ollama",
    name: "Ollama",
    baseUrl: "http://127.0.0.1:11434",
    modelsPath: "/api/tags",
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    baseUrl: "http://127.0.0.1:1234",
    modelsPath: "/v1/models",
  },
] as const;

export type LocalServerId = (typeof LOCAL_SERVER_CANDIDATES)[number]["id"];

/** Outcome per server. `error` carries only host:port, never body or URL. */
export type LocalServerResult =
  | {
      status: "found";
      id: LocalServerId;
      name: string;
      baseUrl: string;
      models: string[];
    }
  | { status: "not_running"; id: LocalServerId; name: string }
  | { status: "error"; id: LocalServerId; name: string; host: string };

export type FoundLocalServer = Extract<LocalServerResult, { status: "found" }>;

export type LocalServerScan = { results: LocalServerResult[] };

/** Longest answer read from a server: a model list is never this big. */
export const SCAN_BODY_MAX_BYTES = 1_000_000;
export const SCAN_TIMEOUT_MS = 1_500;
const SCAN_MODELS_MAX = 100;

/** The body as text, or null once it grows past the cap. */
async function readCapped(response: Response): Promise<string | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      bytes += value.byteLength;
      if (bytes > SCAN_BODY_MAX_BYTES) return null;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

/** Plain model ids from Ollama `{ models: [{ name }] }` or OpenAI `{ data: [{ id }] }`. */
function modelIdsOf(payload: unknown): string[] | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as { models?: unknown; data?: unknown };
  const list = Array.isArray(record.models) ? record.models : record.data;
  if (!Array.isArray(list)) return null;
  const ids: string[] = [];
  for (const entry of list) {
    if (typeof entry !== "object" || entry === null) continue;
    const item = entry as { id?: unknown; name?: unknown };
    const id = sanitizeModelId(item.id ?? item.name);
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length === SCAN_MODELS_MAX) break;
  }
  return ids;
}

async function probe(
  candidate: (typeof LOCAL_SERVER_CANDIDATES)[number],
  fetchImpl: FetchLike,
): Promise<LocalServerResult> {
  const { id, name, baseUrl } = candidate;
  const failed: LocalServerResult = {
    status: "error",
    id,
    name,
    host: new URL(baseUrl).host,
  };
  let response: Response;
  try {
    // guardUrl runs the same loopback/address rules as every model call.
    response = await modelFetch(
      fetchImpl,
      `${baseUrl}${candidate.modelsPath}`,
      { method: "GET", headers: { accept: "application/json" } },
      { guardUrl: true, timeoutMs: SCAN_TIMEOUT_MS },
    );
  } catch {
    // Refused, timed out or blocked: nothing is listening there.
    return { status: "not_running", id, name };
  }
  try {
    if (!response.ok) return failed;
    const text = await readCapped(response);
    if (text === null) return failed;
    const models = modelIdsOf(JSON.parse(text));
    return models ? { status: "found", id, name, baseUrl, models } : failed;
  } catch {
    return failed;
  }
}

/**
 * Looks for Ollama and LM Studio on this machine. Server-side only: the
 * browser cannot reach the server's loopback. A failure says only which host
 * did not answer, so no path, query, header or error text can leak.
 */
export async function scanLocalServers(
  fetchImpl: FetchLike = fetch,
): Promise<LocalServerScan> {
  const results = await Promise.all(
    LOCAL_SERVER_CANDIDATES.map((c) => probe(c, fetchImpl)),
  );
  return { results };
}
