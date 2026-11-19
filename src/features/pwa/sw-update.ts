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

const SHELL_CACHE_PREFIX = "openbot-shell-";

type Registrations = {
  getRegistrations(): Promise<readonly { unregister(): Promise<boolean> }[]>;
};
type ShellCaches = {
  keys(): Promise<string[]>;
  delete(key: string): Promise<boolean>;
};

/**
 * Dev never registers the worker, but one left by a production run on the
 * same port keeps serving its cached /_next/static/ chunks, which sends the
 * dev page into a reload loop. Removing it and its shell caches ends that.
 */
export async function dropServiceWorkers(
  container: Registrations,
  storage?: ShellCaches,
): Promise<void> {
  const registrations = await container.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
  if (!storage) return;
  const keys = await storage.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(SHELL_CACHE_PREFIX))
      .map((key) => storage.delete(key)),
  );
}
