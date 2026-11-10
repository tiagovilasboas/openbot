"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  clearCredentials,
  getAuthSnapshot,
  getServerAuthSnapshot,
  loadCredentials,
  saveCredentials,
  setSessionUnlocked,
  subscribeAuth,
} from "./auth-storage.ts";
import {
  createCredentials,
  upgradeCredentials,
  verifyPassword,
} from "./local-auth.ts";

export function useLocalAuth() {
  const snapshot = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getServerAuthSnapshot,
  );
  const [error, setError] = useState<string | null>(null);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    setError(null);
    const creds = loadCredentials();
    if (!creds) {
      setSessionUnlocked(true);
      return true;
    }

    const isValid = await verifyPassword(password, creds);
    if (isValid) {
      setSessionUnlocked(true);
      // Older credentials were hashed with fewer iterations: re-hash now.
      try {
        const stronger = await upgradeCredentials(password, creds);
        if (stronger) saveCredentials(stronger);
      } catch {
        // The unlock already worked; the upgrade retries next time.
      }
      return true;
    }

    setError("invalid_password");
    return false;
  }, []);

  const lock = useCallback(() => {
    setSessionUnlocked(false);
    setError(null);
  }, []);

  const setupPassword = useCallback(
    async (password: string, hintText?: string): Promise<boolean> => {
      setError(null);
      if (!password || password.length < 4) {
        setError("password_too_short");
        return false;
      }

      const creds = await createCredentials(password, hintText);
      saveCredentials(creds);
      return true;
    },
    [],
  );

  const removePassword = useCallback(
    async (currentPassword: string): Promise<boolean> => {
      setError(null);
      const creds = loadCredentials();
      if (!creds) return true;

      const isValid = await verifyPassword(currentPassword, creds);
      if (!isValid) {
        setError("invalid_password");
        return false;
      }

      clearCredentials();
      return true;
    },
    [],
  );

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
      newHint?: string,
    ): Promise<boolean> => {
      setError(null);
      const creds = loadCredentials();
      if (!creds) return false;

      const isValid = await verifyPassword(currentPassword, creds);
      if (!isValid) {
        setError("invalid_password");
        return false;
      }

      if (!newPassword || newPassword.length < 4) {
        setError("password_too_short");
        return false;
      }

      const newCreds = await createCredentials(newPassword, newHint);
      saveCredentials(newCreds);
      return true;
    },
    [],
  );

  return {
    hasPassword: snapshot.hasPassword,
    isLocked: snapshot.isLocked,
    hint: snapshot.hint,
    error,
    clearError: () => setError(null),
    unlock,
    lock,
    setupPassword,
    removePassword,
    changePassword,
  };
}
