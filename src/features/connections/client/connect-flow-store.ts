import {
  IDLE,
  nextConnectState,
  type ConnectEvent,
  type ConnectionId,
  type ConnectState,
} from "../core/index.ts";

/** The Connect in progress or just ended, for whichever service it was. */
export interface ConnectFlow {
  id: ConnectionId | null;
  state: ConnectState;
}

const IDLE_FLOW: ConnectFlow = { id: null, state: IDLE };

let flow: ConnectFlow = IDLE_FLOW;
let listeners: Array<() => void> = [];

export function subscribeConnectFlow(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

export function readConnectFlow(): ConnectFlow {
  return flow;
}

export function readIdleConnectFlow(): ConnectFlow {
  return IDLE_FLOW;
}

function publish(next: ConnectFlow): void {
  flow = next;
  for (const listener of listeners) listener();
}

/** Applies one event through the core reducer and tells the listeners. */
export function dispatchConnect(id: ConnectionId, event: ConnectEvent): void {
  const state = nextConnectState(flow.state, event);
  if (state !== flow.state) publish({ id, state });
}

/** Clears a settled outcome, such as after the notice is dismissed. */
export function resetConnectFlow(): void {
  if (flow !== IDLE_FLOW) publish(IDLE_FLOW);
}
