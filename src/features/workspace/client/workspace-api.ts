import { withApiHeaders } from "../../server-guard/api-request-init.ts";

export type LibraryFile = { path: string; bytes: number; modifiedAt: number };

export type LibraryState =
  | { status: "loading" }
  | { status: "disabled" }
  | { status: "failed" }
  | { status: "ready"; files: LibraryFile[] };

function readFiles(raw: unknown): LibraryFile[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is LibraryFile =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as LibraryFile).path === "string" &&
      typeof (f as LibraryFile).bytes === "number" &&
      typeof (f as LibraryFile).modifiedAt === "number",
  );
}

/** The bot's files from the server, or why there are none to show. */
export async function fetchLibrary(
  botId: string,
  fetchFn: typeof fetch = fetch,
): Promise<LibraryState> {
  try {
    const response = await fetchFn(
      `/api/workspace/files?botId=${encodeURIComponent(botId)}`,
      withApiHeaders(),
    );
    if (!response.ok) return { status: "failed" };
    const data = (await response.json()) as {
      enabled?: unknown;
      files?: unknown;
    };
    if (data.enabled !== true) return { status: "disabled" };
    return { status: "ready", files: readFiles(data.files) };
  } catch {
    return { status: "failed" };
  }
}

/** Fetches one file and hands it to the browser as a download. */
export async function downloadLibraryFile(
  botId: string,
  path: string,
): Promise<boolean> {
  const query = `botId=${encodeURIComponent(botId)}&path=${encodeURIComponent(path)}`;
  try {
    const response = await fetch(
      `/api/workspace/file?${query}`,
      withApiHeaders(),
    );
    if (!response.ok) return false;
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = path.split("/").pop() ?? "file";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/** A short size label: bytes, KB or MB. */
export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
