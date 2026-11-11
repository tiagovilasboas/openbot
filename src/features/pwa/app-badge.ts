/**
 * The installed app's icon badge (Badging API) behind a tiny port, so the
 * rest of the app never touches `navigator`. Where the browser lacks it the
 * port is null and nothing happens.
 */
export interface AppBadgePort {
  set(count: number): Promise<void>;
  clear(): Promise<void>;
}

interface BadgingNavigator {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

export function appBadgePort(
  nav: BadgingNavigator | undefined = typeof navigator !== "undefined"
    ? navigator
    : undefined,
): AppBadgePort | null {
  if (!nav || typeof nav.setAppBadge !== "function") return null;
  const setBadge = nav.setAppBadge.bind(nav);
  const clearBadge = nav.clearAppBadge?.bind(nav);
  return {
    set: (count) => setBadge(count),
    clear: () => (clearBadge ? clearBadge() : setBadge(0)),
  };
}

/** Shows the total on the icon, or clears it at 0. Never throws. */
export async function syncAppBadge(
  port: AppBadgePort | null,
  total: number,
): Promise<void> {
  if (!port) return;
  try {
    if (total > 0) await port.set(total);
    else await port.clear();
  } catch {
    // The badge is an enhancement; a refusal (permissions, OS) is fine.
  }
}
