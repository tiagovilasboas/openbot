"use client";

import { useState } from "react";
import type { ChatLanguage } from "../chat/respond-to-message.ts";

interface LockScreenProps {
  language: ChatLanguage;
  hint: string | null;
  onUnlock: (password: string) => Promise<boolean>;
}

export function LockScreen({ language, hint, onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const isPt = language === "pt";

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
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4 backdrop-blur-2xl text-zinc-100 font-sans selection:bg-zinc-800 animate-in fade-in duration-300">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* Glowing Shield / Lock Icon */}
        <div className="relative mb-6 flex size-16 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl shadow-black">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-sm" />
          <svg
            className="relative size-8 text-emerald-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-1.5">
          {isPt ? "OpenBot Bloqueado" : "OpenBot Locked"}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mb-6">
          {isPt
            ? "Digite sua senha ou PIN local para acessar"
            : "Enter your local password or PIN to access"}
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              placeholder={
                isPt ? "Senha ou PIN local" : "Local password or PIN"
              }
              className="w-full rounded-xl border border-white/10 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
              aria-label={
                showPassword
                  ? isPt
                    ? "Ocultar senha"
                    : "Hide password"
                  : isPt
                    ? "Mostrar senha"
                    : "Show password"
              }
            >
              {showPassword ? "👁️‍🗨️" : "👁️"}
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-500/30 px-3 py-2 text-xs text-red-300 animate-in fade-in duration-150">
              {isPt
                ? "Senha incorreta. Tente novamente."
                : "Incorrect password. Try again."}
            </div>
          )}

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-white active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-white/5"
          >
            {loading
              ? isPt
                ? "Desbloqueando..."
                : "Unlocking..."
              : isPt
                ? "Desbloquear"
                : "Unlock"}
          </button>
        </form>

        {hint && (
          <div className="mt-4 flex flex-col items-center">
            {!showHint ? (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="text-[11px] text-zinc-400 hover:text-zinc-300 underline transition-colors cursor-pointer"
              >
                {isPt ? "Ver dica de senha" : "Show password hint"}
              </button>
            ) : (
              <p className="text-xs text-zinc-400 bg-zinc-900/70 border border-white/5 rounded-lg px-3 py-1.5">
                💡 <span className="font-medium text-zinc-300">{hint}</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-10 flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
          <span className="size-1.5 rounded-full bg-emerald-400/80" />
          <span>
            {isPt
              ? "100% Offline · PBKDF2 Web Crypto Local"
              : "100% Offline · Local PBKDF2 Web Crypto"}
          </span>
        </div>
      </div>
    </div>
  );
}
