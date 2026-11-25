// A routine is opened for editing from outside the routines list (the goal
// section) through this window event, so the two sections stay decoupled.
const EVENT = "openbot:open-routine";

/** Asks the routines list of the open bot editor to open one routine. */
export function requestOpenRoutine(routineId: string): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: routineId }));
}

/** Listens for open requests; returns the way to stop listening. */
export function onOpenRoutine(handler: (routineId: string) => void) {
  const listener = (event: Event) => {
    const id = (event as CustomEvent<unknown>).detail;
    if (typeof id === "string") handler(id);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
