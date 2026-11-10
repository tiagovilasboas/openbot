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

export function getLockCopy(isPt: boolean): LockCopy {
  return isPt ? PT : EN;
}
