"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SKIP_WAITING_MESSAGE,
  createReloadGuard,
  dropServiceWorkers,
  updateIsWaiting,
} from "./sw-update.ts";

/**
 * Registers the worker and reports a waiting update. `update` asks that
 * worker to take over; the page reloads once the new one controls it.
 */
export function useServiceWorkerUpdate(): {
  updateReady: boolean;
  update: () => void;
} {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const guard = useRef(createReloadGuard());

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      const storage = "caches" in window ? window.caches : undefined;
      void dropServiceWorkers(navigator.serviceWorker, storage).catch(() => {
        // Best effort: a failure only leaves the old worker in place.
      });
      return;
    }
    const container = navigator.serviceWorker;
    const check = (reg: ServiceWorkerRegistration) =>
      setUpdateReady(updateIsWaiting(reg, Boolean(container.controller)));
    const onControllerChange = () => {
      if (guard.current.shouldReload()) window.location.reload();
    };
    container.addEventListener("controllerchange", onControllerChange);
    container
      .register("/sw.js")
      .then((reg) => {
        setRegistration(reg);
        check(reg);
        reg.addEventListener("updatefound", () => {
          reg.installing?.addEventListener("statechange", () => check(reg));
        });
      })
      .catch(() => {
        // Registration is an enhancement; the app works without it.
      });
    return () =>
      container.removeEventListener("controllerchange", onControllerChange);
  }, []);

  const update = useCallback(() => {
    if (!registration?.waiting) return;
    guard.current.request();
    registration.waiting.postMessage(SKIP_WAITING_MESSAGE);
  }, [registration]);

  return { updateReady, update };
}
