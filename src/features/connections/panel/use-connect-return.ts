"use client";

import { useEffect } from "react";
import { refreshSavedKeys } from "../../key-vault/saved-keys-store.ts";
import {
  dispatchConnect,
  eventsForOutcome,
  finishConnect,
  parseConnectReturn,
  withoutConnectParams,
} from "../client/index.ts";

/**
 * Finishes a Connect the provider sent the browser back to. The params leave
 * the address bar before anything else, so a reload cannot replay the code.
 * Mount once at the app root; `onReturn` lets the app show the outcome.
 */
export function useConnectReturn(onReturn: () => void): void {
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const returned = parseConnectReturn(search);
    if (!returned) return;
    window.history.replaceState(
      window.history.state,
      "",
      withoutConnectParams(pathname, search, hash),
    );
    onReturn();
    const { id } = returned;
    void (async () => {
      dispatchConnect(id, { type: "start" });
      dispatchConnect(id, { type: "returned" });
      const outcome = await finishConnect(returned);
      if (outcome.status === "connected") await refreshSavedKeys();
      // Back to a settled state, then the result as the reducer defines it.
      dispatchConnect(id, { type: "cancel" });
      for (const event of eventsForOutcome(outcome)) dispatchConnect(id, event);
    })();
  }, [onReturn]);
}
