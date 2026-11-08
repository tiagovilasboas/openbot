"use client";

import { useState } from "react";
import type { ChatLanguage } from "../chat/respond-to-message.ts";

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
  const isPt = language === "pt";

  const [currentPassword, setCurrentPassword] = useState("");
  const [updatedPassword, setUpdatedPassword] = useState("");
  const [updatedConfirm, setUpdatedConfirm] = useState("");
  const [updatedHint, setUpdatedHint] = useState(hint || "");
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    onFeedback(null, null);
    if (!currentPassword) {
      onFeedback(
        isPt
          ? "Informe a senha atual para remover."
          : "Enter current password to remove.",
        null,
      );
      return;
    }

    setLoading(true);
    try {
      const ok = await onRemovePassword(currentPassword);
      if (ok) {
        onFeedback(
          null,
          isPt
            ? "Proteção por senha removida."
            : "Password protection removed.",
        );
        setCurrentPassword("");
      } else {
        onFeedback(
          isPt ? "Senha atual incorreta." : "Incorrect current password.",
          null,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    onFeedback(null, null);
    if (!currentPassword) {
      onFeedback(
        isPt ? "Informe a senha atual." : "Enter your current password.",
        null,
      );
      return;
    }
    if (updatedPassword.length < 4) {
      onFeedback(
        isPt
          ? "A nova senha deve ter pelo menos 4 caracteres."
          : "New password must be at least 4 characters.",
        null,
      );
      return;
    }
    if (updatedPassword !== updatedConfirm) {
      onFeedback(
        isPt ? "As novas senhas não coincidem." : "New passwords do not match.",
        null,
      );
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
        onFeedback(
          null,
          isPt
            ? "Senha atualizada com sucesso!"
            : "Password updated successfully!",
        );
        setCurrentPassword("");
        setUpdatedPassword("");
        setUpdatedConfirm("");
      } else {
        onFeedback(
          isPt ? "Senha atual incorreta." : "Incorrect current password.",
          null,
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-300">
            {isPt
              ? "Proteção Ativa (Bloqueio Local)"
              : "Protection Active (Local Lock)"}
          </span>
        </div>
        {hint && (
          <span className="text-[11px] text-zinc-400">
            {isPt ? `Dica: ${hint}` : `Hint: ${hint}`}
          </span>
        )}
      </div>

      <form
        onSubmit={handleChange}
        className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 flex flex-col gap-3"
      >
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          {isPt ? "Alterar Senha ou PIN" : "Change Password or PIN"}
        </h4>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-400">
            {isPt ? "Senha Atual" : "Current Password"}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-400">
            {isPt ? "Nova Senha" : "New Password"}
          </label>
          <input
            type="password"
            value={updatedPassword}
            onChange={(e) => setUpdatedPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-400">
            {isPt ? "Confirmar Nova Senha" : "Confirm New Password"}
          </label>
          <input
            type="password"
            value={updatedConfirm}
            onChange={(e) => setUpdatedConfirm(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-400">
            {isPt ? "Nova Dica (Opcional)" : "New Hint (Optional)"}
          </label>
          <input
            type="text"
            value={updatedHint}
            onChange={(e) => setUpdatedHint(e.target.value)}
            placeholder={isPt ? "Dica de senha" : "Password hint"}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            type="submit"
            disabled={loading || !currentPassword || !updatedPassword}
            className="flex-1 rounded-xl bg-zinc-100 hover:bg-white text-black py-2.5 text-xs font-semibold transition-all disabled:opacity-40"
          >
            {loading
              ? isPt
                ? "Salvando..."
                : "Saving..."
              : isPt
                ? "Atualizar Senha"
                : "Update Password"}
          </button>
          <button
            type="button"
            disabled={loading || !currentPassword}
            onClick={handleRemove}
            className="rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-red-300 px-3 py-2.5 text-xs font-medium transition-all disabled:opacity-40"
          >
            {isPt ? "Remover Senha" : "Remove Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
