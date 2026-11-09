"use client";

import { useState } from "react";
import { fillCopy } from "@/features/model/settings-copy.ts";
import { FIELD_CLASS, FormField } from "@/shared/ui/FormField.tsx";
import { SecretInput } from "@/shared/ui/SecretInput.tsx";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { getSecurityCopy } from "./security-copy.ts";

export interface SecurityManageFormProps {
  language: ChatLanguage;
  hint: string | null;
  onRemovePassword: (currentPassword: string) => Promise<boolean>;
  onChangePassword: (
    current: string,
    newPass: string,
    newHint?: string,
  ) => Promise<boolean>;
  onFeedback: (error: string | null, success: string | null) => void;
}

export function SecurityManageForm({
  language,
  hint,
  onRemovePassword,
  onChangePassword,
  onFeedback,
}: SecurityManageFormProps) {
  const c = getSecurityCopy(language);

  const [currentPassword, setCurrentPassword] = useState("");
  const [updatedPassword, setUpdatedPassword] = useState("");
  const [updatedConfirm, setUpdatedConfirm] = useState("");
  const [updatedHint, setUpdatedHint] = useState(hint || "");
  const [isRemoving, setIsRemoving] = useState(false);
  const [removePassword, setRemovePassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault();
    onFeedback(null, null);
    if (!removePassword) {
      onFeedback(c.needCurrent, null);
      return;
    }

    setLoading(true);
    try {
      const ok = await onRemovePassword(removePassword);
      if (ok) {
        onFeedback(null, c.removeDone);
        setRemovePassword("");
        setIsRemoving(false);
      } else {
        onFeedback(c.wrongCurrent, null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    onFeedback(null, null);
    if (!currentPassword) {
      onFeedback(c.needCurrent, null);
      return;
    }
    if (updatedPassword.length < 4) {
      onFeedback(c.newTooShort, null);
      return;
    }
    if (updatedPassword !== updatedConfirm) {
      onFeedback(c.newMismatch, null);
      return;
    }

    setLoading(true);
    try {
      const ok = await onChangePassword(
        currentPassword,
        updatedPassword,
        updatedHint,
      );
      if (ok) {
        onFeedback(null, c.changeDone);
        setCurrentPassword("");
        setUpdatedPassword("");
        setUpdatedConfirm("");
      } else {
        onFeedback(c.wrongCurrent, null);
      }
    } finally {
      setLoading(false);
    }
  }

  const secretProps = { showLabel: c.showSecret, hideLabel: c.hideSecret };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2">
        <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
          {c.statusActive}
        </span>
        {hint && (
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-muted">
            {fillCopy(c.hintPrefix, { hint })}
          </span>
        )}
      </div>

      <form onSubmit={handleChange} className="flex flex-col gap-4">
        <h4 className="text-[15px] font-semibold text-foreground">
          {c.changeTitle}
        </h4>
        <FormField label={c.currentLabel}>
          {(control) => (
            <SecretInput
              {...control}
              {...secretProps}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
          )}
        </FormField>
        <FormField label={c.newLabel} helper={c.passwordHelper}>
          {(control) => (
            <SecretInput
              {...control}
              {...secretProps}
              value={updatedPassword}
              onChange={setUpdatedPassword}
              autoComplete="new-password"
            />
          )}
        </FormField>
        <FormField label={c.confirmNewLabel}>
          {(control) => (
            <SecretInput
              {...control}
              {...secretProps}
              value={updatedConfirm}
              onChange={setUpdatedConfirm}
              autoComplete="new-password"
            />
          )}
        </FormField>
        <FormField label={c.newHintLabel}>
          {(control) => (
            <input
              {...control}
              type="text"
              value={updatedHint}
              onChange={(e) => setUpdatedHint(e.target.value)}
              placeholder={c.hintPlaceholder}
              className={FIELD_CLASS}
            />
          )}
        </FormField>
        <button
          type="submit"
          disabled={loading || !currentPassword || !updatedPassword}
          className="min-h-11 w-full rounded-full bg-foreground px-6 text-[15px] font-semibold text-background transition-opacity hover:opacity-90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:ms-auto md:w-fit md:text-sm"
        >
          {loading && !isRemoving ? c.updating : c.update}
        </button>
      </form>

      <section className="flex flex-col gap-3 border-t border-separator pt-6">
        <h4 className="text-[15px] font-semibold text-foreground">
          {c.removeTitle}
        </h4>
        <p className="text-[13px] text-subtle">{c.removeHelper}</p>
        {isRemoving ? (
          <form onSubmit={handleRemove} className="flex flex-col gap-4">
            <FormField label={c.removeCurrentLabel}>
              {(control) => (
                <SecretInput
                  {...control}
                  {...secretProps}
                  value={removePassword}
                  onChange={setRemovePassword}
                  autoComplete="current-password"
                />
              )}
            </FormField>
            <div className="flex gap-2 md:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsRemoving(false);
                  setRemovePassword("");
                }}
                className="min-h-11 flex-1 rounded-full border border-border bg-surface px-5 text-[15px] font-medium text-foreground active:scale-[0.97] md:flex-none md:text-sm"
              >
                {c.cancel}
              </button>
              <button
                type="submit"
                disabled={loading || !removePassword}
                className="min-h-11 flex-1 rounded-full bg-danger px-5 text-[15px] font-semibold text-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:flex-none md:text-sm"
              >
                {loading ? c.removing : c.removeConfirm}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              onFeedback(null, null);
              setIsRemoving(true);
            }}
            className="min-h-11 w-fit rounded-full px-4 text-[15px] font-medium text-danger transition-colors hover:bg-danger-soft active:scale-[0.97] md:text-sm"
          >
            {c.removeStart}
          </button>
        )}
      </section>
    </div>
  );
}
