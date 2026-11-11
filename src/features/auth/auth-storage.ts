import type { LocalAuthCredentials } from "./auth-types.ts";
import { normalizeCredentials } from "./stored-credentials.ts";

export const AUTH_STORAGE_KEY = "openbot_auth_credentials";
export const SESSION_LOCK_KEY = "openbot_auth_unlocked";

export interface AuthSnapshot {
  hasPassword: boolean;
  isLocked: boolean;
  hint: string | null;
}

const serverSnapshot: AuthSnapshot = {
  hasPassword: false,
  isLocked: false,
  hint: null,
};

let cachedSnapshot: AuthSnapshot = serverSnapshot;

export function getAuthSnapshot(): AuthSnapshot {
  if (typeof window === "undefined") return serverSnapshot;
  const creds = loadCredentials();
  const hasPassword = Boolean(creds);
  const isLocked = hasPassword ? !isSessionUnlocked() : false;
  const hint = creds?.hint || null;

  if (
    cachedSnapshot.hasPassword === hasPassword &&
    cachedSnapshot.isLocked === isLocked &&
    cachedSnapshot.hint === hint
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = { hasPassword, isLocked, hint };
  return cachedSnapshot;
}

export function getServerAuthSnapshot(): AuthSnapshot {
  return serverSnapshot;
}

let listeners: Array<() => void> = [];

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.push(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners = listeners.filter((item) => item !== listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export function loadCredentials(): LocalAuthCredentials | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return normalizeCredentials(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: LocalAuthCredentials): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  // Never write what loading would refuse; the hint is cut to its cap.
  const safe = normalizeCredentials(credentials);
  if (!safe) return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(safe));
    setSessionUnlocked(true);
    notifyListeners();
  } catch {
    // Ignore storage quota errors
  }
}

export function clearCredentials(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setSessionUnlocked(false);
    notifyListeners();
  } catch {
    // Ignore storage errors
  }
}

export function isSessionUnlocked(): boolean {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return false;
  }
  try {
    return window.sessionStorage.getItem(SESSION_LOCK_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSessionUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }
  try {
    if (unlocked) {
      window.sessionStorage.setItem(SESSION_LOCK_KEY, "true");
    } else {
      window.sessionStorage.removeItem(SESSION_LOCK_KEY);
    }
    notifyListeners();
  } catch {
    // Ignore session storage errors
  }
}
