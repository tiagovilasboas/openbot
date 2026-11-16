import { modelFetch } from "./guarded-model-fetch.ts";
import type { FetchLike } from "./model-adapter.ts";
import { sanitizeModelId } from "./model-id.ts";

/** Local model servers worth looking for; both are plain loopback URLs. */
export const LOCAL_SERVER_CANDIDATES = [
  {
    id: "ollama",
    name: "Ollama",
    baseUrl: "http://127.0.0.1:11434",
    modelsPath: "/v1/models",
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    baseUrl: "http://127.0.0.1:1234",
    modelsPath: "/v1/models",
  },
] as const;

export type LocalServerId = (typeof LOCAL_SERVER_CANDIDATES)[number]["id"];

/** A server that answered, with the model ids it lists. */
export type FoundLocalServer = {
  id: LocalServerId;
  name: string;
  baseUrl: string;
  models: string[];
};

/** A server that did not answer; only its host, never a path or a reason. */
export type MissingLocalServer = { id: LocalServerId; host: string };

export type LocalServerScan = {
  servers: FoundLocalServer[];
  unreachable: MissingLocalServer[];
};

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

/** Plain model ids from an OpenAI-style `{ data: [{ id }] }` list. */
function modelIdsOf(payload: unknown): string[] | null {
  const data = (payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return null;
  const ids: string[] = [];
  for (const entry of data) {
    const id = sanitizeModelId((entry as { id?: unknown } | null)?.id);
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length === SCAN_MODELS_MAX) break;
  }
  return ids;
}

async function probe(
  candidate: (typeof LOCAL_SERVER_CANDIDATES)[number],
  fetchImpl: FetchLike,
): Promise<FoundLocalServer | null> {
  try {
    // guardUrl runs the same loopback/address rules as every model call.
    const response = await modelFetch(
      fetchImpl,
      `${candidate.baseUrl}${candidate.modelsPath}`,
      { method: "GET", headers: { accept: "application/json" } },
      { guardUrl: true, timeoutMs: SCAN_TIMEOUT_MS },
    );
    if (!response.ok) return null;
    const text = await readCapped(response);
    if (text === null) return null;
    const models = modelIdsOf(JSON.parse(text));
    return models
      ? {
          id: candidate.id,
          name: candidate.name,
          baseUrl: candidate.baseUrl,
          models,
        }
      : null;
  } catch {
    return null;
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
  const servers: FoundLocalServer[] = [];
  const unreachable: MissingLocalServer[] = [];
  results.forEach((found, index) => {
    const candidate = LOCAL_SERVER_CANDIDATES[index];
    if (found) servers.push(found);
    else {
      unreachable.push({
        id: candidate.id,
        host: new URL(candidate.baseUrl).host,
      });
    }
  });
  return { servers, unreachable };
}
