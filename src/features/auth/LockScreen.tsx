"use client";

import { useEffect, useRef, useState } from "react";
import { FormField } from "@/shared/ui/FormField.tsx";
import { SecretInput } from "@/shared/ui/SecretInput.tsx";
import { SpinnerIcon } from "@/shared/ui/FieldIcons.tsx";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { getLockCopy } from "./auth-copy.ts";

interface LockScreenProps {
  language: ChatLanguage;
  hint: string | null;
  onUnlock: (password: string) => Promise<boolean>;
}

export function LockScreen({ language, hint, onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  const copy = getLockCopy(language === "pt");

  useEffect(() => {
    fieldRef.current?.querySelector("input")?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(false);

    try {
      const ok = await onUnlock(password);
      if (!ok) {
        setError(true);
        setPassword("");
        fieldRef.current?.querySelector("input")?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 animate-fade-in overflow-y-auto bg-background pt-safe pb-safe text-foreground">
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center px-5 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/openbot-icon.svg"
          alt=""
          width={56}
          height={56}
          className="mb-6 size-14 rounded-2xl"
        />
        <h1 className="mb-1.5 text-balance text-center text-[26px] font-semibold tracking-[-0.02em] md:text-[32px] md:tracking-[-0.025em]">
          {copy.title}
        </h1>
        <p className="mb-8 text-balance text-center text-[15px] text-muted md:text-sm">
          {copy.hint}
        </p>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <FormField label={copy.label} error={error ? copy.error : null}>
            {(control) => (
              <div ref={fieldRef}>
                <SecretInput
                  {...control}
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (error) setError(false);
                  }}
                  placeholder={copy.placeholder}
                  showLabel={copy.show}
                  hideLabel={copy.hide}
                  autoComplete="current-password"
                />
              </div>
            )}
          </FormField>

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[15px] font-semibold text-background transition-transform active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
          >
            {loading && <SpinnerIcon className="size-4" />}
            {loading ? copy.unlocking : copy.unlock}
          </button>
        </form>

        {hint && (
          <div className="mt-4 flex flex-col items-center">
            {!showHint ? (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="min-h-11 rounded-full px-4 text-[15px] text-muted underline underline-offset-4 transition-colors hover:text-foreground md:text-sm"
              >
                {copy.showHint}
              </button>
            ) : (
              <p className="rounded-xl bg-surface px-3.5 py-2.5 text-[13px] text-foreground">
                {hint}
              </p>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-[13px] text-subtle">
          {copy.offline}
        </p>
      </div>
    </div>
  );
}
