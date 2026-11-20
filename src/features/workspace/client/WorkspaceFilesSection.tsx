"use client";

import { useCallback, useEffect, useState } from "react";
import type { Language } from "../../language/language.ts";
import {
  downloadLibraryFile,
  fetchLibrary,
  sizeLabel,
  type LibraryState,
} from "./workspace-api.ts";
import { getWorkspaceCopy } from "./workspace-copy.ts";

/** The bot's file library: what its tools wrote, newest first. */
export function WorkspaceFilesSection({
  botId,
  language,
}: {
  botId: string;
  language: Language;
}) {
  const copy = getWorkspaceCopy(language);
  const [state, setState] = useState<LibraryState>({ status: "loading" });
  const [downloadFailed, setDownloadFailed] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setState(await fetchLibrary(botId));
  }, [botId]);

  useEffect(() => {
    let alive = true;
    void fetchLibrary(botId).then((next) => {
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, [botId]);

  const when = (ms: number) =>
    new Date(ms).toLocaleString(language === "pt" ? "pt-BR" : language, {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <section aria-label={copy.title} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted md:text-[13px]">{copy.note}</p>
        {state.status !== "disabled" && (
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-9 shrink-0 rounded-full px-3 text-xs font-medium text-muted hover:text-foreground"
          >
            {copy.refresh}
          </button>
        )}
      </div>
      {state.status === "loading" && (
        <p className="text-xs text-subtle md:text-[13px]">{copy.loading}</p>
      )}
      {state.status === "disabled" && (
        <p className="text-xs text-subtle md:text-[13px]">{copy.disabled}</p>
      )}
      {state.status === "failed" && (
        <p role="alert" className="text-xs text-danger md:text-[13px]">
          {copy.failed}
        </p>
      )}
      {state.status === "ready" && state.files.length === 0 && (
        <p className="text-xs text-subtle md:text-[13px]">{copy.empty}</p>
      )}
      {state.status === "ready" && state.files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {state.files.map((file) => (
            <li key={file.path}>
              <button
                type="button"
                aria-label={copy.download(file.path)}
                onClick={async () =>
                  setDownloadFailed(
                    !(await downloadLibraryFile(botId, file.path)),
                  )
                }
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left transition-colors hover:bg-surface"
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {file.path}
                </span>
                <span className="shrink-0 text-xs text-subtle">
                  {sizeLabel(file.bytes)} · {when(file.modifiedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {downloadFailed && (
        <p role="alert" className="text-xs text-danger md:text-[13px]">
          {copy.downloadFailed}
        </p>
      )}
    </section>
  );
}
