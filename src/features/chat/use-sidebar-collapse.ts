import { useState, useSyncExternalStore } from "react";

// Tablet widths, between Tailwind's md and lg: the full sidebar would take a
// third of the screen, so it starts as the narrow rail there.
const TABLET_QUERY = "(min-width: 48rem) and (max-width: 63.999rem)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(TABLET_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the desktop sidebar shows as the rail. It follows the screen
 * (rail on tablets, full panel above) until the user toggles it.
 */
export function useSidebarCollapse() {
  const isTablet = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(TABLET_QUERY).matches,
    () => false,
  );
  const [choice, setChoice] = useState<boolean | null>(null);
  const isCollapsed = choice ?? isTablet;
  return {
    isCollapsed,
    toggle: () => setChoice(!isCollapsed),
  };
}
