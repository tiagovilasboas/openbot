export const GITHUB_TOKEN_STORAGE_KEY = "openbot_github_token";

const maxTokenLength = 300;

export function sanitizeGitHubToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const trimmed = token.trim();
  if (!trimmed || trimmed.length > maxTokenLength) return null;
  // Basic sanity check: personal access tokens start with ghp_, gho_, github_pat_, etc. or classic alphanumeric
  return trimmed;
}

let cachedToken: string | null = null;
let listeners: Array<() => void> = [];

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGitHubToken(listener: () => void): () => void {
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

export function loadStoredGitHubToken(): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);
    if (raw === cachedToken) {
      return cachedToken;
    }
    cachedToken = sanitizeGitHubToken(raw);
    return cachedToken;
  } catch {
    cachedToken = null;
    return null;
  }
}

export function saveStoredGitHubToken(token: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    const sanitized = sanitizeGitHubToken(token);
    if (sanitized) {
      window.localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, sanitized);
      cachedToken = sanitized;
      notifyListeners();
    }
  } catch {
    // Ignore storage write exceptions silently
  }
}

export function clearStoredGitHubToken(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
    cachedToken = null;
    notifyListeners();
  } catch {
    // Ignore storage exceptions silently
  }
}
