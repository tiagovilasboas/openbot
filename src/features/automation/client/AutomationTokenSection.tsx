"use client";

import { useEffect, useState } from "react";
import type { ChatLanguage } from "../../chat/respond-to-message.ts";
import {
  createToken,
  curlExample,
  fetchTokenStatus,
  revokeToken,
} from "./automation-api.ts";
import { getAutomationCopy } from "./automation-copy.ts";

const BUTTON =
  "min-h-10 rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const PRIMARY = `${BUTTON} bg-foreground text-background`;
const SECONDARY = `${BUTTON} border border-border text-foreground`;

export function AutomationTokenSection({
  language,
}: {
  language: ChatLanguage;
}) {
  const c = getAutomationCopy(language);
  const [exists, setExists] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void fetchTokenStatus().then((status) => {
      if (live && status) setExists(status.exists);
    });
    return () => {
      live = false;
    };
  }, []);

  async function handleCreate() {
    setBusy(true);
    setNotice(null);
    setCopied(false);
    const created = await createToken();
    setBusy(false);
    if (created) {
      setToken(created);
      setExists(true);
    } else setNotice(c.failed);
  }

  async function handleRevoke() {
    setBusy(true);
    const ok = await revokeToken();
    setBusy(false);
    setToken(null);
    if (ok) {
      setExists(false);
      setNotice(c.revoked);
    } else setNotice(c.failed);
  }

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setNotice(c.failed);
    }
  }

  return (
    <section
      className="mt-2 grid gap-2 border-t border-separator pt-4 md:gap-3"
      aria-labelledby="automation-title"
    >
      <h3
        id="automation-title"
        className="text-sm font-semibold md:text-[15px]"
      >
        {c.title}
      </h3>
      <p className="text-xs text-muted md:text-sm">{c.description}</p>
      <p className="text-sm font-medium">{exists ? c.statusOn : c.statusOff}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={PRIMARY}
          disabled={busy}
          onClick={handleCreate}
        >
          {busy ? c.working : exists ? c.rotate : c.create}
        </button>
        {exists ? (
          <button
            type="button"
            className={SECONDARY}
            disabled={busy}
            onClick={handleRevoke}
          >
            {c.revoke}
          </button>
        ) : null}
      </div>
      {token ? (
        <div className="grid gap-2" role="status">
          <p className="text-sm">{c.shownOnce}</p>
          <label className="grid gap-1 text-sm">
            {c.tokenLabel}
            <input
              readOnly
              value={token}
              className="min-h-11 rounded-xl border border-border bg-surface px-3 font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button type="button" className={SECONDARY} onClick={handleCopy}>
            {copied ? c.copied : c.copy}
          </button>
          <p className="text-sm font-medium">{c.exampleTitle}</p>
          <pre className="overflow-x-auto rounded-xl bg-surface p-3 text-xs">
            {curlExample(window.location.origin, token)}
          </pre>
          <p className="text-xs text-muted">{c.exampleNote}</p>
        </div>
      ) : null}
      {notice ? <p className="text-sm">{notice}</p> : null}
    </section>
  );
}
