/** The message the page sends a waiting worker once the user accepts. */
export const SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

/**
 * An update is offered only when a worker is waiting while another already
 * controls the page; the first install has no controller and just activates.
 */
export function updateIsWaiting(
  registration: { waiting: unknown } | null | undefined,
  hasController: boolean,
): boolean {
  return Boolean(registration?.waiting) && hasController;
}

/**
 * Reload at most once, and only after the user asked for the update: a
 * controller change from anything else (first claim, another tab) is ignored.
 */
export function createReloadGuard(): {
  request: () => void;
  shouldReload: () => boolean;
} {
  let requested = false;
  let reloaded = false;
  return {
    request: () => {
      requested = true;
    },
    shouldReload: () => {
      if (!requested || reloaded) return false;
      reloaded = true;
      return true;
    },
  };
}
