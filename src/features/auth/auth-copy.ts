import type { Language } from "../language/language.ts";

interface LockCopy {
  title: string;
  hint: string;
  placeholder: string;
  label: string;
  show: string;
  hide: string;
  error: string;
  unlock: string;
  unlocking: string;
  showHint: string;
  offline: string;
}

const PT: LockCopy = {
  title: "OpenBot bloqueado",
  hint: "Digite sua senha ou PIN local para acessar.",
  placeholder: "Senha ou PIN local",
  label: "Senha ou PIN",
  show: "Mostrar senha",
  hide: "Ocultar senha",
  error: "Senha incorreta. Tente novamente.",
  unlock: "Desbloquear",
  unlocking: "Desbloqueando...",
  showHint: "Ver dica de senha",
  offline: "100% offline. Bloqueio de tela local (hash PBKDF2).",
};

const EN: LockCopy = {
  title: "OpenBot locked",
  hint: "Enter your local password or PIN to access.",
  placeholder: "Local password or PIN",
  label: "Password or PIN",
  show: "Show password",
  hide: "Hide password",
  error: "Incorrect password. Try again.",
  unlock: "Unlock",
  unlocking: "Unlocking...",
  showHint: "Show password hint",
  offline: "100% offline. Local screen lock (PBKDF2 hash).",
};

const ES: LockCopy = {
  title: "OpenBot bloqueado",
  hint: "Escribe tu contraseña o PIN local para acceder.",
  placeholder: "Contraseña o PIN local",
  label: "Contraseña o PIN",
  show: "Mostrar contraseña",
  hide: "Ocultar contraseña",
  error: "Contraseña incorrecta. Inténtalo de nuevo.",
  unlock: "Desbloquear",
  unlocking: "Desbloqueando...",
  showHint: "Ver pista de la contraseña",
  offline: "100 % sin conexión. Bloqueo de pantalla local (hash PBKDF2).",
};

const LOCK_COPY: Record<Language, LockCopy> = { pt: PT, en: EN, es: ES };

export function getLockCopy(language: Language): LockCopy {
  return LOCK_COPY[language];
}
