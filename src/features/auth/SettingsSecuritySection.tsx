"use client";

import { useEffect, useRef, useState } from "react";
import { AlertIcon, CheckIcon, LockIcon } from "@/shared/ui/FieldIcons.tsx";
import { FIELD_CLASS, FormField } from "@/shared/ui/FormField.tsx";
import { SecretInput } from "@/shared/ui/SecretInput.tsx";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { SecurityManageForm } from "./SecurityManageForm.tsx";
import { getSecurityCopy } from "./security-copy.ts";

export interface SettingsSecuritySectionProps {
  language: ChatLanguage;
  hasPassword: boolean;
  hint: string | null;
  onSetupPassword: (password: string, hint?: string) => Promise<boolean>;
  onRemovePassword: (currentPassword: string) => Promise<boolean>;
  onChangePassword: (
    current: string,
    newPass: string,
    newHint?: string,
  ) => Promise<boolean>;
}

export function SettingsSecuritySection({
  language,
  hasPassword,
  hint,
  onSetupPassword,
  onRemovePassword,
  onChangePassword,
}: SettingsSecuritySectionProps) {
  const c = getSecurityCopy(language);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newHint, setNewHint] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Forms can be taller than the viewport: bring the result into view.
  useEffect(() => {
    if (error || success) {
      feedbackRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [error, success]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 4) {
      setError(c.tooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(c.mismatch);
      return;
    }

    setLoading(true);
    try {
      const ok = await onSetupPassword(newPassword, newHint);
      if (ok) {
        setSuccess(c.setupDone);
        setNewPassword("");
        setConfirmPassword("");
        setNewHint("");
      } else {
        setError(c.setupFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-[15px] font-semibold text-foreground">{c.title}</h3>
        <p className="text-[13px] text-subtle">{c.description}</p>
      </div>

      <div
        ref={feedbackRef}
        role="status"
        aria-live="polite"
        className="empty:hidden"
      >
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger"
          >
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-[13px] text-success">
            <CheckIcon className="mt-0.5 size-4 shrink-0" />
            {success}
          </p>
        )}
      </div>

      {!hasPassword ? (
        <form onSubmit={handleSetup} className="flex flex-col gap-4">
          <h4 className="text-[15px] font-semibold text-foreground">
            {c.setupTitle}
          </h4>
          <FormField label={c.passwordLabel} helper={c.passwordHelper}>
            {(control) => (
              <SecretInput
                {...control}
                value={newPassword}
                onChange={setNewPassword}
                showLabel={c.showSecret}
                hideLabel={c.hideSecret}
                autoComplete="new-password"
              />
            )}
          </FormField>
          <FormField label={c.confirmLabel}>
            {(control) => (
              <SecretInput
                {...control}
                value={confirmPassword}
                onChange={setConfirmPassword}
                showLabel={c.showSecret}
                hideLabel={c.hideSecret}
                autoComplete="new-password"
              />
            )}
          </FormField>
          <FormField label={c.hintLabel}>
            {(control) => (
              <input
                {...control}
                type="text"
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                placeholder={c.hintPlaceholder}
                className={FIELD_CLASS}
              />
            )}
          </FormField>
          <button
            type="submit"
            disabled={loading || !newPassword}
            className="min-h-11 w-full rounded-full bg-foreground px-6 text-[15px] font-semibold text-background transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:ms-auto md:w-fit md:text-sm"
          >
            {loading ? c.enabling : c.enable}
          </button>
        </form>
      ) : (
        <SecurityManageForm
          language={language}
          hint={hint}
          onRemovePassword={onRemovePassword}
          onChangePassword={onChangePassword}
          onFeedback={(err, succ) => {
            setError(err);
            setSuccess(succ);
          }}
        />
      )}

      <p className="flex items-start gap-2 text-[13px] text-subtle">
        <LockIcon className="mt-0.5 size-4 shrink-0" />
        {c.offlineNote}
      </p>
    </div>
  );
}
