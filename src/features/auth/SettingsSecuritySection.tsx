"use client";

import { useState } from "react";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { SecurityManageForm } from "./SecurityManageForm.tsx";

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
  const isPt = language === "pt";

  // Setup state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newHint, setNewHint] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword.length < 4) {
      setError(
        isPt
          ? "A senha deve ter pelo menos 4 caracteres."
          : "Password must be at least 4 characters.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isPt ? "As senhas não coincidem." : "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const ok = await onSetupPassword(newPassword, newHint);
      if (ok) {
        setSuccess(
          isPt
            ? "Senha local ativada com sucesso!"
            : "Local password enabled successfully!",
        );
        setNewPassword("");
        setConfirmPassword("");
        setNewHint("");
      } else {
        setError(isPt ? "Falha ao definir senha." : "Failed to set password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 text-zinc-100 animate-in fade-in duration-200">
      <div>
        <h3 className="text-base font-semibold text-white">
          {isPt ? "Segurança & Bloqueio Local" : "Security & Local Lock"}
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          {isPt
            ? "Proteja seu OpenBot com senha ou PIN 100% offline via Web Crypto."
            : "Protect your OpenBot with a 100% offline password or PIN via Web Crypto."}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
          {success}
        </div>
      )}

      {!hasPassword ? (
        <form onSubmit={handleSetup} className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              {isPt ? "Definir Senha ou PIN" : "Set Password or PIN"}
            </h4>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">
                {isPt
                  ? "Senha ou PIN (mínimo 4 caracteres)"
                  : "Password or PIN (min 4 chars)"}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">
                {isPt ? "Confirmar Senha ou PIN" : "Confirm Password or PIN"}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400">
                {isPt ? "Dica de Senha (Opcional)" : "Password Hint (Optional)"}
              </label>
              <input
                type="text"
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                placeholder={
                  isPt
                    ? "Ex: data especial, frase favorita"
                    : "e.g. special date"
                }
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword}
              className="mt-2 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 text-xs font-semibold transition-all disabled:opacity-40"
            >
              {loading
                ? isPt
                  ? "Ativando..."
                  : "Enabling..."
                : isPt
                  ? "Ativar Proteção por Senha"
                  : "Enable Password Protection"}
            </button>
          </div>
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

      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-3.5 text-xs text-zinc-400 leading-relaxed">
        🔒{" "}
        <strong className="text-zinc-300">
          {isPt ? "100% Offline:" : "100% Offline:"}
        </strong>{" "}
        {isPt
          ? "Sua senha nunca é enviada para nenhum servidor. A criptografia é feita diretamente no navegador via Web Crypto PBKDF2 com 100.000 iterações SHA-256."
          : "Your password is never sent to any server. Cryptography runs locally in the browser via Web Crypto PBKDF2 with 100,000 SHA-256 iterations."}
      </div>
    </div>
  );
}
